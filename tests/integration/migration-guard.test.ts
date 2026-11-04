import 'dotenv/config'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

test('normal migration refuses the discarded schema before writing a new checksum ledger', async () => {
  const url = new URL(process.env.HCI_TEST_DATABASE_URL || '')
  if (
    !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) ||
    !url.pathname.endsWith('_test')
  )
    throw new Error('Disposable local database required')
  const control = new Client({ connectionString: url.href })
  await control.connect()
  const name = `cms_legacy_${randomBytes(5).toString('hex')}_test`
  let target: Client | undefined
  try {
    await control.query(`CREATE DATABASE "${name}"`)
    url.pathname = `/${name}`
    target = new Client({ connectionString: url.href })
    await target.connect()
    await target.query(
      "CREATE TABLE posts (title text); CREATE TABLE hci_migration_checksums (name text); INSERT INTO posts VALUES ('Keep this row')",
    )
    const result = spawnSync('pnpm', ['db:migrate'], {
      env: { ...process.env, DB_HCI_URL: url.href },
      encoding: 'utf8',
      timeout: 30000,
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /explicitly authorized one-time reset/)
    assert.equal((await target.query('SELECT title FROM posts')).rows[0].title, 'Keep this row')
    assert.equal(
      (await target.query("SELECT to_regclass('public.cms_migration_checksums') AS ledger")).rows[0]
        .ledger,
      null,
    )
  } finally {
    await target?.end()
    await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await control.end()
  }
})
