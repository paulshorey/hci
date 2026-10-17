import 'dotenv/config'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { Client } from 'pg'

test('deployment bootstrap requires credentials once and never replaces existing accounts', async () => {
  const url = new URL(process.env.HCI_TEST_DATABASE_URL || '')
  if (
    !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) ||
    !url.pathname.endsWith('_test')
  )
    throw new Error('Bootstrap tests require a disposable local test database.')
  const control = new Client({ connectionString: url.href })
  await control.connect()
  const name = `hci_bootstrap_${randomBytes(5).toString('hex')}_test`
  let database: Client | undefined
  try {
    await control.query(`CREATE DATABASE "${name}"`)
    url.pathname = `/${name}`
    const env = {
      ...process.env,
      DB_HCI_URL: url.href,
      STORAGE_DRIVER: 'disk',
      ALLOW_PERSISTENT_DISK: 'true',
      CMS_BOOTSTRAP_EMAIL: 'owner@example.test',
      CMS_BOOTSTRAP_PASSWORD: '',
    }
    const run = (command: string, variables = env) =>
      execFileSync('pnpm', [command], { env: variables, stdio: 'pipe', timeout: 90000 })
    run('db:migrate')
    assert.throws(() => run('cms:bootstrap'), /CMS_BOOTSTRAP_PASSWORD/)
    run('cms:bootstrap', { ...env, CMS_BOOTSTRAP_PASSWORD: randomBytes(32).toString('hex') })
    database = new Client({ connectionString: url.href })
    await database.connect()
    const first = await database.query('SELECT email, role, hash FROM users')
    assert.equal(first.rowCount, 1)
    assert.equal(first.rows[0].email, 'owner@example.test')
    assert.equal(first.rows[0].role, 'admin')
    run('cms:bootstrap', {
      ...env,
      CMS_BOOTSTRAP_EMAIL: 'another@example.test',
      CMS_BOOTSTRAP_PASSWORD: randomBytes(32).toString('hex'),
    })
    const repeated = await database.query('SELECT email, role, hash FROM users')
    assert.equal(repeated.rowCount, 1)
    assert.equal(repeated.rows[0].email, first.rows[0].email)
    assert.equal(repeated.rows[0].role, 'admin')
    assert.equal(repeated.rows[0].hash === first.rows[0].hash, true)
  } finally {
    await database?.end()
    await control.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
      [name],
    )
    await control.query(`DROP DATABASE IF EXISTS "${name}"`)
    await control.end()
  }
})
