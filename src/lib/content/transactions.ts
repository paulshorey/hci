import { APIError, type PayloadRequest } from 'payload'
import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function transactionDatabase(req: PayloadRequest) {
  const id = await req.transactionID
  const db = (id && req.payload.db.sessions?.[String(id)]?.db) as MigrateUpArgs['db'] | undefined
  if (!db) throw new APIError('This operation requires a database transaction.', 500)
  return db
}

export async function lockPublishedContent(req: PayloadRequest) {
  const db = await transactionDatabase(req)
  await db.execute(sql`SELECT pg_advisory_xact_lock(728451604)`)
}
