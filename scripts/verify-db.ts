import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import { schemaSnapshot } from './snapshot-db'
import { required } from '@multimedia/cms/lib/env'

const baseURL = new URL(required('HCI_TEST_DATABASE_URL'))
if (
  !['127.0.0.1', 'localhost', 'postgres'].includes(baseURL.hostname) ||
  !baseURL.pathname.endsWith('_test')
)
  throw new Error(
    'HCI_TEST_DATABASE_URL must identify a disposable local database ending in _test.',
  )
const name = `hci_contract_${randomBytes(6).toString('hex')}`
const client = new Client({ connectionString: baseURL.href })
await client.connect()
try {
  await client.query(`CREATE DATABASE "${name}"`)
  const target = new URL(baseURL)
  target.pathname = `/${name}`
  execFileSync('pnpm', ['db:migrate'], {
    stdio: 'inherit',
    env: { ...process.env, DB_HCI_URL: target.href },
  })
  const snapshot = schemaSnapshot(target.href)
  const digest = (value: string) => createHash('sha256').update(value).digest('hex')
  assert.equal(
    digest(snapshot),
    digest(await readFile('schema/current.sql', 'utf8')),
    'Migrated database differs from the committed schema snapshot.',
  )
  execFileSync('pnpm', ['exec', 'tsx', 'scripts/verify-payload-schema.ts'], {
    stdio: 'inherit',
    env: { ...process.env, DB_HCI_URL: target.href },
  })
  execFileSync('pnpm', ['generate:types'], { stdio: 'inherit' })
  execFileSync(
    'git',
    [
      'diff',
      '--exit-code',
      '--',
      'packages/multimedia-cms/src/generated',
      'src/app/(payload)/admin/importMap.js',
    ],
    {
      stdio: 'inherit',
    },
  )
  console.log('Fresh-database migrations, Payload schema, and generated contracts verified.')
} finally {
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  await client.end()
}
