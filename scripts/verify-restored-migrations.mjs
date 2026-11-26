import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import path from 'node:path'

const [commit] = process.argv.slice(2)
assert.match(commit, /^[a-f0-9]{40}$/)
const migrations = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, 'src/migrations'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((file) => file.endsWith('.ts') && file !== 'src/migrations/index.ts')
assert.ok(migrations.length, 'No migration sources found for the deployed commit')
const expected = Object.fromEntries(
  migrations.map((file) => [
    path.basename(file, '.ts'),
    createHash('sha256')
      .update(execFileSync('git', ['show', `${commit}:${file}`]))
      .digest('hex'),
  ]),
)
const restored = JSON.parse(await new Response(process.stdin).text())
assert.deepEqual(restored, expected, 'Restored migration ledger differs')
