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
const reset = JSON.parse(readFileSync('schema/baseline-reset.json', 'utf8'))
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
