import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline'

const [directory, manifestPath] = process.argv.slice(2)
const root = await realpath(directory)
const archivedFiles = manifestPath
  ? new Map(JSON.parse(await readFile(manifestPath)).files.map(({ key, file }) => [key, file]))
  : null
let count = 0
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  const { key, size, sha256 } = JSON.parse(line)
  const archivedFile = archivedFiles ? archivedFiles.get(key) : key
  assert.ok(archivedFile, 'A database reference is missing from the archive inventory')
  const file = await realpath(path.resolve(root, archivedFile))
  assert.ok(file.startsWith(root + path.sep), 'Object path leaves the restored storage directory')
  const info = await stat(file)
  assert.ok(info.isFile(), `Expected a regular file for ${key}`)
  if (size !== null) assert.equal(info.size, size, `Size mismatch for ${key}`)
  if (sha256 !== null) {
    const digest = createHash('sha256')
    for await (const chunk of createReadStream(file)) digest.update(chunk)
    assert.equal(digest.digest('hex'), sha256, `Manifest mismatch for ${key}`)
  }
  count++
}
console.log(`Verified ${count} stored file references from the restored database.`)
