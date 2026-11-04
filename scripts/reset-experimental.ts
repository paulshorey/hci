/** One-time, explicitly authorized cutover from the discarded experimental schema. */
import 'dotenv/config'
import { Client } from 'pg'
import { readFile, mkdir, chmod } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { required } from '@multimedia/cms/lib/env'

const argument = (name: string) => process.argv[process.argv.indexOf(name) + 1]
const environment = argument('--environment')
if (
  !['local', 'development', 'production'].includes(environment || '') ||
  argument('--acknowledge') !== 'discard-experimental-content-20261024'
)
  throw new Error(
    'This one-time reset requires the exact environment and discard-experimental-content-20261024 acknowledgement.',
  )
const target = new URL(required('DB_HCI_URL'))
if (!['postgres:', 'postgresql:'].includes(target.protocol) || target.hash || target.search)
  throw new Error('Reset requires an unambiguous PostgreSQL connection URL without query options.')
const expected = {
  local: ['127.0.0.1', '55432', '/hci'],
  development: ['altaria.proxy.rlwy.net', '43203', '/railway'],
  production: ['switchyard.proxy.rlwy.net', '24607', '/railway'],
}[environment as 'local' | 'development' | 'production']
if (
  target.hostname !== expected[0] ||
  target.port !== expected[1] ||
  target.pathname !== expected[2]
)
  throw new Error(
    'The database endpoint does not match this environment in docs/deployment.md. Stop and verify the target.',
  )
const manifest = JSON.parse(await readFile('schema/baseline-reset.json', 'utf8')) as {
  removedGitBlobs: Record<string, string>
}
const names = Object.keys(manifest.removedGitBlobs)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => path.basename(name, '.ts'))
  .sort()
const client = new Client({ connectionString: target.href, connectionTimeoutMillis: 10000 })
await client.connect()
try {
  await client.query("SET statement_timeout = '60s'")
  await client.query('SELECT pg_advisory_lock(728451602)')
  const tables = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  )
  const existing = tables.rows.map((row) => row.tablename)
  if (existing.includes('entries') || existing.includes('cms_migration_checksums')) {
    if (
      existing.includes('posts') ||
      !existing.includes('entries') ||
      !existing.includes('cms_migration_checksums')
    )
      throw new Error('Unexpected mixed schema. Refusing to reset it.')
    console.log('The new CMS baseline is already present. Preserved all new data.')
  } else {
    if (
      !existing.includes('posts') ||
      !existing.includes('hci_migration_checksums') ||
      !existing.includes('payload_migrations')
    )
      throw new Error('Expected experimental blog schema is absent. Refusing reset.')
    const applied = await client.query<{ name: string }>(
      'SELECT name FROM payload_migrations ORDER BY name',
    )
    if (JSON.stringify(applied.rows.map((row) => row.name)) !== JSON.stringify(names))
      throw new Error(
        'Migration history differs from the explicitly discarded baseline. Refusing reset.',
      )
    const serverVersion = Number(
      (await client.query('SHOW server_version_num')).rows[0].server_version_num,
    )
    const dumpVersion = execFileSync('pg_dump', ['--version'], { encoding: 'utf8' })
    if (Math.floor(serverVersion / 10000) !== 17 || !/\b17\./.test(dumpVersion))
      throw new Error('The selected database and backup client must both use PostgreSQL 17.')
    const directory = path.resolve('.local', 'database-backups')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await chmod(directory, 0o700)
    const backup = path.join(
      directory,
      `${environment}-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`,
    )
    execFileSync(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-privileges', '--file', backup],
      {
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([key]) => !key.startsWith('PG')),
          ),
          NODE_ENV: process.env.NODE_ENV,
          PGHOST: target.hostname,
          PGPORT: target.port,
          PGUSER: decodeURIComponent(target.username),
          PGPASSWORD: decodeURIComponent(target.password),
          PGDATABASE: decodeURIComponent(target.pathname.slice(1)),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 300000,
      },
    )
    await chmod(backup, 0o600)
    await client.query('BEGIN')
    try {
      await client.query('DROP SCHEMA public CASCADE')
      await client.query('CREATE SCHEMA public AUTHORIZATION CURRENT_USER')
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    console.log(
      `Reset only the ${environment} experimental application schema. Owner-readable backup saved under .local/database-backups.`,
    )
  }
} finally {
  await client.end()
}
