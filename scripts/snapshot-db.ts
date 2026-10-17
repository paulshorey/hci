import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { required } from '../src/lib/env'

export function schemaSnapshot(databaseURL: string): string {
  // Connection strings stay in the environment rather than process arguments or logs.
  const url = new URL(databaseURL)
  const pgEnv: Record<string, string> = {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  }
  for (const [key, value] of url.searchParams) {
    if (!['sslmode', 'sslrootcert'].includes(key))
      throw new Error('Unsupported snapshot connection option.')
    pgEnv[`PG${key.toUpperCase()}`] = value
  }
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('PG')),
  )
  const connectionEnv = { ...env, NODE_ENV: process.env.NODE_ENV, ...pgEnv }
  const clientMajor = /\b(\d+)\./.exec(
    execFileSync('pg_dump', ['--version'], { encoding: 'utf8' }),
  )?.[1]
  const serverMajor = String(
    Math.floor(
      Number(
        execFileSync('psql', ['-Atqc', 'SHOW server_version_num'], {
          env: connectionEnv,
          encoding: 'utf8',
        }).trim(),
      ) / 10000,
    ),
  )
  if (clientMajor !== serverMajor)
    throw new Error(
      `Schema snapshots require matching PostgreSQL client/server major versions (client ${clientMajor}, server ${serverMajor}).`,
    )
  return (
    execFileSync('pg_dump', ['--schema-only', '--no-owner', '--no-privileges', '--schema=public'], {
      env: connectionEnv,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('--') &&
          !line.startsWith('\\restrict ') &&
          !line.startsWith('\\unrestrict '),
      )
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir('schema', { recursive: true })
  await writeFile('schema/current.sql', schemaSnapshot(required('DATABASE_URL')))
  console.log('Wrote schema/current.sql')
}
