import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, symlink, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateRawSync, crc32 } from 'node:zlib'
import { readFolder, readZip, validateFiles } from '../../src/lib/snippets/bundles'
import { safeRelativePath } from '../../src/lib/storage/index'

function zipFile(name: string, contents: Buffer, mode = 0o100644): Buffer {
  const filename = Buffer.from(name)
  const compressed = deflateRawSync(contents)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(crc32(contents), 14)
  local.writeUInt32LE(compressed.length, 18)
  local.writeUInt32LE(contents.length, 22)
  local.writeUInt16LE(filename.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(0x314, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(crc32(contents), 16)
  central.writeUInt32LE(compressed.length, 20)
  central.writeUInt32LE(contents.length, 24)
  central.writeUInt16LE(filename.length, 28)
  central.writeUInt32LE((mode * 65536) >>> 0, 38)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + filename.length, 12)
  end.writeUInt32LE(local.length + filename.length + compressed.length, 16)
  return Buffer.concat([local, filename, compressed, central, filename, end])
}

test('bundle manifest preserves nested paths, MIME types, and integrity hashes', () => {
  const manifest = validateFiles([
    { path: 'index.html', bytes: Buffer.from('<html></html>') },
    { path: 'assets/main.js', bytes: Buffer.from('export default 1') },
  ])
  assert.equal(manifest.files[1].path, 'assets/main.js')
  assert.match(manifest.files[1].contentType, /javascript/)
  assert.equal(manifest.files[0].sha256.length, 64)
})

test('bundle paths reject traversal, ambiguity, hidden files, and absolute names', () => {
  for (const value of [
    '../secret',
    '/etc/passwd',
    'a/../../b',
    'a\\b',
    'a//b',
    'a/./b',
    '.env',
    'a/%2e%2e/b',
    'a\0b',
  ])
    assert.throws(() => safeRelativePath(value))
  assert.equal(safeRelativePath('assets/a-b_1.woff2'), 'assets/a-b_1.woff2')
})

test('manifest rejects missing entry, case collisions, unsupported files, and file floods', () => {
  assert.throws(() => validateFiles([{ path: 'script.js', bytes: Buffer.from('') }]), /missing/)
  assert.throws(
    () =>
      validateFiles(['index.html', 'INDEX.HTML'].map((path) => ({ path, bytes: Buffer.from('') }))),
    /colliding/,
  )
  assert.throws(
    () =>
      validateFiles([
        { path: 'index.html', bytes: Buffer.from('') },
        { path: 'run.sh', bytes: Buffer.from('') },
      ]),
    /Unsupported/,
  )
  assert.throws(
    () =>
      validateFiles(
        Array.from({ length: 501 }, (_, index) => ({
          path: `${index}.html`,
          bytes: Buffer.from(''),
        })),
      ),
    /500/,
  )
})

test('ZIP importer reads a real compressed archive and rejects symlinks, traversal, and expansion bombs', async () => {
  assert.equal(
    (await readZip(zipFile('index.html', Buffer.from('hello'))))[0].bytes.toString(),
    'hello',
  )
  await assert.rejects(readZip(zipFile('../escape.js', Buffer.from('x'))))
  await assert.rejects(
    readZip(zipFile('link.html', Buffer.from('/etc/passwd'), 0o120777)),
    /symlink/,
  )
  await assert.rejects(
    readZip(zipFile('large.html', Buffer.alloc(21 * 1024 * 1024))),
    /size limits/,
  )
  await assert.rejects(readZip(Buffer.from('not a zip')), /Invalid ZIP/)
})

test('local folder import rejects symlinks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hci-bundle-'))
  try {
    await writeFile(path.join(root, 'index.html'), 'hello')
    await symlink('/etc/passwd', path.join(root, 'secret.txt'))
    await assert.rejects(readFolder(root), /Symlinks/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
