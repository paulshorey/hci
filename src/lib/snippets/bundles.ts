import { createHash, randomUUID } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import yauzl from 'yauzl'
import type { Payload, PayloadRequest } from 'payload'
import type { User } from '@/generated/payload-types'
import { objectStorage, safeRelativePath, type ObjectStorage } from '@/lib/storage'

export const limits = {
  zip: 25 * 1024 * 1024,
  expanded: 100 * 1024 * 1024,
  file: 20 * 1024 * 1024,
  count: 500,
}
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
}
export type BundleFile = { path: string; bytes: Buffer }
export type Manifest = {
  files: { path: string; size: number; contentType: string; sha256: string }[]
}

export function validateFiles(files: BundleFile[], entryFile = 'index.html'): Manifest {
  safeRelativePath(entryFile)
  if (!entryFile.endsWith('.html')) throw new Error('Entry file must be HTML.')
  if (!files.length || files.length > limits.count)
    throw new Error('Bundle must contain between 1 and 500 files.')
  const seen = new Set<string>()
  let size = 0
  const manifest = files.map((file) => {
    safeRelativePath(file.path)
    const canonical = file.path.toLowerCase()
    if (seen.has(canonical)) throw new Error('Duplicate or case-colliding bundle paths.')
    seen.add(canonical)
    const contentType = contentTypes[path.extname(file.path).toLowerCase()]
    if (!contentType) throw new Error(`Unsupported bundle file type: ${path.extname(file.path)}`)
    size += file.bytes.length
    if (file.bytes.length > limits.file || size > limits.expanded)
      throw new Error('Expanded bundle exceeds size limits.')
    return {
      path: file.path,
      size: file.bytes.length,
      contentType,
      sha256: createHash('sha256').update(file.bytes).digest('hex'),
    }
  })
  if (!files.some((file) => file.path === entryFile)) throw new Error('Entry HTML file is missing.')
  return { files: manifest }
}

export async function readFolder(folder: string): Promise<BundleFile[]> {
  const root = path.resolve(folder)
  const files: BundleFile[] = []
  let total = 0
  async function visit(relative: string) {
    const directory = path.join(root, relative)
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('Symlinks are not supported.')
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name
      safeRelativePath(name)
      if (entry.isSymbolicLink()) throw new Error('Symlinks are not supported.')
      if (entry.isDirectory()) await visit(name)
      else {
        const stat = await lstat(path.join(root, name))
        total += stat.size
        if (
          !stat.isFile() ||
          stat.size > limits.file ||
          total > limits.expanded ||
          files.length >= limits.count
        )
          throw new Error('Folder exceeds bundle limits or contains a special file.')
        files.push({ path: name, bytes: await readFile(path.join(root, name)) })
      }
    }
  }
  await visit('')
  return files
}

export async function readZip(bytes: Buffer): Promise<BundleFile[]> {
  if (bytes.length > limits.zip) throw new Error('ZIP exceeds 25 MB.')
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid ZIP archive.'))
      const files: BundleFile[] = []
      let total = 0
      let entries = 0
      let stopped = false
      const fail = (reason: Error) => {
        if (!stopped) {
          stopped = true
          zip.close()
          reject(reason)
        }
      }
      zip.on('error', fail)
      zip.on('entry', (entry) => {
        try {
          if (++entries > limits.count * 2) throw new Error('Too many ZIP entries.')
          const mode = (entry.externalFileAttributes >>> 16) & 0o170000
          if (mode === 0o120000) throw new Error('ZIP symlinks are not supported.')
          if (entry.generalPurposeBitFlag & 1) throw new Error('Encrypted ZIPs are not supported.')
          const name = entry.fileName.replace(/\/$/, '')
          safeRelativePath(name)
          if (entry.fileName.endsWith('/')) {
            zip.readEntry()
            return
          }
          if (
            entry.uncompressedSize > limits.file ||
            files.length >= limits.count ||
            total + entry.uncompressedSize > limits.expanded
          )
            throw new Error('Expanded ZIP exceeds size limits.')
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(new Error('Cannot read ZIP entry.'))
            const chunks: Buffer[] = []
            let size = 0
            stream.on('error', fail)
            stream.on('data', (chunk: Buffer) => {
              size += chunk.length
              total += chunk.length
              if (size > limits.file || total > limits.expanded) {
                stream.destroy()
                fail(new Error('Expanded ZIP exceeds size limits.'))
              } else chunks.push(chunk)
            })
            stream.on('end', () => {
              if (!stopped) {
                files.push({ path: name, bytes: Buffer.concat(chunks) })
                zip.readEntry()
              }
            })
          })
        } catch (reason) {
          fail(reason as Error)
        }
      })
      zip.on('end', () => {
        if (!stopped) resolve(files)
      })
      zip.readEntry()
    })
  })
}

export async function importBundle({
  payload,
  files,
  title,
  entryFile = 'index.html',
  user,
  req,
  storage = objectStorage(),
}: {
  payload: Payload
  files: BundleFile[]
  title: string
  entryFile?: string
  user?: User
  req?: PayloadRequest
  storage?: ObjectStorage
}) {
  if (!title.trim()) throw new Error('A bundle title is required.')
  const manifest = validateFiles(files, entryFile)
  const bundleVersion = randomUUID()
  const storagePrefix = `snippets/${bundleVersion}`
  const written: string[] = []
  try {
    for (const file of files) {
      const key = `${storagePrefix}/${file.path}`
      await storage.write(
        key,
        file.bytes,
        manifest.files.find((item) => item.path === file.path)!.contentType,
      )
      written.push(key)
    }
    return await payload.create({
      collection: 'snippets',
      data: { title, storagePrefix, entryFile, bundleVersion, manifest, _status: 'draft' },
      context: { bundleImport: true },
      overrideAccess: !user,
      user,
      req,
    })
  } catch (error) {
    await Promise.allSettled(written.map((key) => storage.remove(key)))
    throw error
  }
}
