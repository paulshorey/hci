import 'dotenv/config'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { Client } from 'pg'

test('sample seed resumes interrupted dependencies and entries without rewriting existing samples', async () => {
  const url = new URL(process.env.HCI_TEST_DATABASE_URL || '')
  if (
    !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) ||
    !url.pathname.endsWith('_test')
  )
    throw new Error('Seed tests require a disposable local test database.')
  const control = new Client({ connectionString: url.href })
  await control.connect()
  const name = `hci_seed_${randomBytes(5).toString('hex')}_test`
  const directory = await mkdtemp(path.join(tmpdir(), 'hci-seed-'))
  let database: Client | undefined
  try {
    await control.query(`CREATE DATABASE "${name}"`)
    url.pathname = `/${name}`
    const env = {
      ...process.env,
      DB_HCI_URL: url.href,
      STORAGE_DRIVER: 'disk',
      STORAGE_DIR: directory,
      CMS_RUN_JOBS: 'false',
      PAYLOAD_SECRET: randomBytes(32).toString('hex'),
    }
    execFileSync('pnpm', ['db:migrate'], { env, stdio: 'pipe', timeout: 90000 })
    database = new Client({ connectionString: url.href })
    await database.connect()
    const draft = (
      await database.query(`INSERT INTO sources(title,url,notes,_status)
      VALUES('Unfinished owner research',
        'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        'Preserve these private notes','draft') RETURNING *`)
    ).rows[0]
    const interruptAt = async (slug: string) => {
      await database!
        .query(`CREATE OR REPLACE FUNCTION interrupt_sample_seed() RETURNS trigger AS $$
        BEGIN IF NEW.slug = '${slug}' THEN RAISE EXCEPTION 'Injected seed interruption'; END IF;
        RETURN NEW; END; $$ LANGUAGE plpgsql`)
      await database!.query(`CREATE TRIGGER interrupt_sample_seed BEFORE INSERT ON entries
        FOR EACH ROW EXECUTE FUNCTION interrupt_sample_seed()`)
    }
    const run = () => spawnSync('pnpm', ['seed'], { env, encoding: 'utf8', timeout: 90000 })
    await interruptAt('small-targets-bigger-decisions')
    assert.notEqual(run().status, 0)
    assert.equal((await database.query('SELECT count(*)::int AS n FROM topics')).rows[0].n, 1)
    assert.equal((await database.query('SELECT count(*)::int AS n FROM sources')).rows[0].n, 2)
    await database.query('DROP TRIGGER interrupt_sample_seed ON entries')
    await interruptAt('room-to-think')
    const partial = run()
    assert.notEqual(partial.status, 0)
    assert.equal((await database.query('SELECT count(*)::int AS n FROM entries')).rows[0].n, 2)
    const existing = (await database.query('SELECT id,slug FROM entries ORDER BY slug')).rows
    await database.query('DROP TRIGGER interrupt_sample_seed ON entries')
    const resumed = run()
    assert.equal(resumed.status, 0, resumed.stdout + resumed.stderr)
    const entries = (await database.query('SELECT id,slug FROM entries ORDER BY slug')).rows
    assert.equal(entries.length, 3)
    for (const row of existing)
      assert.deepEqual(
        entries.find((entry) => entry.slug === row.slug),
        row,
      )
    const counts = async () =>
      (
        await database!.query(`SELECT
      (SELECT count(*)::int FROM topics) AS topics,
      (SELECT count(*)::int FROM sources) AS sources,
      (SELECT count(*)::int FROM media) AS media,
      (SELECT count(*)::int FROM content_lists) AS lists,
      (SELECT count(*)::int FROM snippets) AS snippets`)
      ).rows[0]
    const before = await counts()
    assert.equal(before.topics, 1)
    assert.equal(before.sources, 2)
    assert.deepEqual(
      (await database.query('SELECT * FROM sources WHERE id=$1', [draft.id])).rows[0],
      draft,
    )
    const repeat = run()
    assert.equal(repeat.status, 0, repeat.stdout + repeat.stderr)
    assert.deepEqual(
      (await database.query('SELECT id,slug FROM entries ORDER BY slug')).rows,
      entries,
    )
    assert.deepEqual(await counts(), before)
    assert.equal((await database.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 0)
  } finally {
    await database?.end()
    await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await control.end()
    await rm(directory, { recursive: true, force: true })
  }
})
