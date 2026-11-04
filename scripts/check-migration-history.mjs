import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const base = process.env.BASE_SHA
if (!base || !/^[a-f0-9]{40}$/.test(base))
  throw new Error('BASE_SHA must identify the reviewed base commit.')
const changed = execFileSync(
  'git',
  ['diff', '--no-renames', '--name-status', '--diff-filter=MDR', base, '--', 'src/migrations'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
// This exact content is the one-time exception authorized for the discarded
// baseline. A PR cannot extend its own deletion allowlist by editing the JSON.
const resetBytes = readFileSync('schema/baseline-reset.json')
const resetBlob = execFileSync('git', ['hash-object', '--stdin'], {
  input: resetBytes,
  encoding: 'utf8',
}).trim()
if (resetBlob !== '0bbd9776846a79d18694408f04f0e34a9c293a50')
  throw new Error('The authorized experimental reset manifest is immutable.')
const reset = JSON.parse(resetBytes.toString('utf8'))
const immutable = changed.filter((line) => {
  if (line.endsWith('/index.ts')) return false
  const [status, path] = line.split('\t')
  if (status !== 'D' || !reset.removedGitBlobs[path]) return true
  const blob = execFileSync('git', ['rev-parse', `${base}:${path}`], { encoding: 'utf8' }).trim()
  return blob !== reset.removedGitBlobs[path]
})
if (immutable.length)
  throw new Error(
    `Established migrations are immutable. Add a forward migration.\n${immutable.join('\n')}`,
  )
console.log('Migration history preserved.')
