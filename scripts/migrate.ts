import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { Client } from 'pg'
import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import config from '../src/payload.config'
import { migrations } from '../src/migrations/index'
import { required } from '../src/lib/env'

export async function migrate(available = migrations) {
  const client = new Client({ connectionString: required('DATABASE_URL') })
  await client.connect()
  let payload: Awaited<ReturnType<typeof getPayload>> | undefined
  try {
    await client.query("SET statement_timeout = '60s'")
    await client.query('SELECT pg_advisory_lock(728451602)')
    await client.query(
      `CREATE TABLE IF NOT EXISTS hci_migration_checksums (name text PRIMARY KEY, checksum text NOT NULL)`,
    )
    const hashes = new Map<string, string>()
    for (const migration of available) {
      const bytes = await readFile(
        new URL(`../src/migrations/${migration.name}.ts`, import.meta.url),
      )
      hashes.set(migration.name, createHash('sha256').update(bytes).digest('hex'))
    }
    const known = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM hci_migration_checksums',
    )
    for (const row of known.rows)
      if (hashes.get(row.name) !== row.checksum)
        throw new Error(`Applied migration is missing or changed: ${row.name}`)
    if (
      (await client.query("SELECT to_regclass('public.payload_migrations') AS table_name")).rows[0]
        .table_name
    ) {
      const applied = await client.query<{ name: string; batch: number }>(
        'SELECT name, batch FROM payload_migrations',
      )
      for (const row of applied.rows) {
        if (row.batch === -1)
          throw new Error('Schema push was used on this database. Refusing automatic migration.')
        if (!known.rows.some((hash) => hash.name === row.name))
          throw new Error(`Missing migration checksum: ${row.name}`)
      }
    }
    payload = await getPayload({ config })
    await payload.db.migrate({
      migrations: available.map((migration) => ({
        ...migration,
        down: async (args: unknown) => migration.down(args as Parameters<typeof migration.down>[0]),
        up: async (input: unknown) => {
          const args = input as Parameters<typeof migration.up>[0]
          await migration.up(args)
          await args.db.execute(
            sql`INSERT INTO hci_migration_checksums (name, checksum) VALUES (${migration.name}, ${hashes.get(migration.name)!})`,
          )
        },
      })),
    })
  } finally {
    await payload?.destroy()
    await client.end()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate()
  // Payload retains a reconnect client; its native CLI also explicitly exits.
  process.exit(0)
}
