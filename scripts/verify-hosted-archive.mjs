import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.argv[2])
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json')))
async function check(file, expected) {
  const sha = createHash('sha256')
  for await (const chunk of createReadStream(file)) sha.update(chunk)
  assert.equal(sha.digest('hex'), expected, 'Retained file checksum mismatch')
}
await check(path.join(root, 'database.dump'), manifest.dumpSha256)
await check(path.join(root, 'restore-file-references.sql'), manifest.referencesSha256)
const keys = new Set()
for (const { key, file, sha256 } of manifest.files) {
  assert.ok(key && !keys.has(key), 'Missing or duplicate archive storage key')
  keys.add(key)
  assert.equal(file, createHash('sha256').update(key).digest('hex'), 'Invalid archive filename')
  await check(path.join(root, 'objects', file), sha256)
}
console.log('Verified archive dump and ' + manifest.files.length + ' object checksums.')
