import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

try {
  await writeFile(
    '.env',
    (await readFile('.env.example', 'utf8'))
      .replace('replace-with-at-least-32-random-characters', randomBytes(32).toString('hex'))
      .replace('replace-with-another-32-random-characters', randomBytes(32).toString('hex')),
    { flag: 'wx', mode: 0o600 },
  )
  console.log(
    'Created ignored .env with random secrets. Start Postgres with docker compose up -d, then run pnpm db:migrate.',
  )
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'EEXIST')
    console.log('.env already exists; preserved existing settings.')
  else throw error
}
