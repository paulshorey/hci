import { execFileSync } from 'node:child_process'

const base = process.env.BASE_SHA
if (!base || !/^[a-f0-9]{40}$/.test(base))
  throw new Error('BASE_SHA must identify the reviewed base commit.')
const changed = execFileSync(
  'git',
  ['diff', '--name-status', '--diff-filter=MDR', base, '--', 'src/migrations'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(Boolean)
const immutable = changed.filter((line) => !line.endsWith('/index.ts'))
if (immutable.length)
  throw new Error(
    `Established migrations are immutable. Add a forward migration.\n${immutable.join('\n')}`,
  )
console.log('Migration history preserved.')
