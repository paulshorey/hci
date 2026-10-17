import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from 'pg'
import { required } from '../src/lib/env'

const url = new URL(required('HCI_TEST_DATABASE_URL'))
if (
  !['127.0.0.1', 'localhost', 'postgres'].includes(url.hostname) ||
  !url.pathname.endsWith('_test')
)
  throw new Error('Browser tests require a local disposable test database.')
const name = `hci_browser_${randomBytes(5).toString('hex')}_test`
const client = new Client({ connectionString: url.href })
await client.connect()
const root = await mkdtemp(path.join(tmpdir(), 'hci-browser-'))
let code = 1
try {
  await client.query(`CREATE DATABASE "${name}"`)
  url.pathname = `/${name}`
  const env = {
    ...process.env,
    DB_HCI_URL: url.href,
    STORAGE_DIR: root,
    STORAGE_DRIVER: 'disk',
    ALLOW_PERSISTENT_DISK: 'true',
    HCI_E2E_EMAIL: 'browser@example.test',
    HCI_E2E_PASSWORD: randomBytes(24).toString('hex'),
    HCI_E2E_EDITOR_EMAIL: 'editor@example.test',
    HCI_E2E_EDITOR_PASSWORD: randomBytes(24).toString('hex'),
  }
  for (const command of [['db:migrate'], ['seed'], ['exec', 'tsx', 'scripts/create-e2e-user.ts']])
    execFileSync('pnpm', command, { env, stdio: 'inherit' })
  code = await new Promise<number>((resolve) => {
    const child = spawn('pnpm', ['exec', 'playwright', 'test'], { env, stdio: 'inherit' })
    child.on('exit', (status) => resolve(status || 0))
  })
} finally {
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  await client.end()
  await rm(root, { recursive: true, force: true })
}
process.exit(code)
