import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash } from 'node:crypto'
import type { ObjectStorage } from '../../src/lib/storage/index'
import { safeRelativePath } from '../../src/lib/storage/index'
import { validPreviewToken } from '../../src/lib/snippets/tokens'
import type { Manifest } from '../../src/lib/snippets/bundles'

export type BundleDescriptor = {
  storage_prefix: string
  entry_file: string
  manifest: Manifest
  _status: string
}
type Dependencies = {
  storage: ObjectStorage
  lookup: (id: string) => Promise<BundleDescriptor | null>
  health: () => Promise<void>
  siteOrigin: string
}

export function embedHandler({ storage, lookup, health, siteOrigin }: Dependencies) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      res.end()
      return
    }
    if (req.url === '/health') {
      try {
        await health()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"status":"ok"}')
      } catch {
        res.writeHead(503)
        res.end('Unavailable')
      }
      return
    }
    try {
      const rawPath = decodeURIComponent((req.url || '').split('?')[0])
      const parts = rawPath.split('/')
      let token = ''
      let id: string
      let resource: string
      if (parts[1] === 'bundles') {
        id = parts[2]
        resource = parts.slice(3).join('/')
      } else if (parts[1] === 'preview') {
        token = parts[2]
        id = parts[3]
        resource = parts.slice(4).join('/')
      } else throw new Error('Unknown path')
      if (!/^\d+$/.test(id) || Number(id) < 1) throw new Error('Invalid ID')
      if (token && !validPreviewToken(token, id)) throw new Error('Invalid preview')
      const bundle = await lookup(id)
      if (!bundle || (!token && bundle._status !== 'published')) throw new Error('Unavailable')
      if (!resource && !rawPath.endsWith('/')) {
        res.writeHead(302, { Location: `${rawPath}/` })
        res.end()
        return
      }
      const relative = safeRelativePath(resource || bundle.entry_file)
      const file = bundle.manifest.files.find((item) => item.path === relative)
      if (!file) throw new Error('Unknown file')
      const bytes = await storage.read(`${bundle.storage_prefix}/${relative}`)
      if (
        bytes.length !== file.size ||
        createHash('sha256').update(bytes).digest('hex') !== file.sha256
      )
        throw new Error('Bundle integrity mismatch')
      res.setHeader('Content-Type', file.contentType)
      res.setHeader(
        'Content-Security-Policy',
        `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors ${siteOrigin}; base-uri 'none'; form-action 'none'; sandbox allow-scripts allow-same-origin`,
      )
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      )
      res.setHeader('ETag', `"${file.sha256}"`)
      res.setHeader(
        'Cache-Control',
        token ? 'private, no-store' : 'public, max-age=0, must-revalidate',
      )
      res.setHeader('Accept-Ranges', 'bytes')
      if (req.headers['if-none-match'] === `"${file.sha256}"` && !token) {
        res.writeHead(304)
        res.end()
        return
      }
      let start = 0
      let end = bytes.length - 1
      let status = 200
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
        if (!range || (!range[1] && !range[2])) {
          res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` })
          res.end()
          return
        }
        if (range[1]) {
          start = Number(range[1])
          if (range[2]) end = Math.min(Number(range[2]), end)
        } else start = Math.max(0, bytes.length - Number(range[2]))
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= bytes.length
        ) {
          res.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` })
          res.end()
          return
        }
        status = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${bytes.length}`)
      }
      res.setHeader('Content-Length', Math.max(0, end - start + 1))
      res.writeHead(status)
      res.end(req.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1))
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  }
}
