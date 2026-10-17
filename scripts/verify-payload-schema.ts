import 'dotenv/config'
import assert from 'node:assert/strict'
import { getTableColumns, getTableName } from '@payloadcms/db-postgres/drizzle'
import { getTableConfig } from '@payloadcms/db-postgres/drizzle/pg-core'
import { getPayload } from 'payload'
import { Client } from 'pg'
import config from '../src/payload.config'
import { required } from '../src/lib/env'

const payload = await getPayload({ config })
const client = new Client({ connectionString: required('DB_HCI_URL') })
await client.connect()
try {
  const normalizeType = (value: string) =>
    value
      .toLowerCase()
      .replace(/"/g, '')
      .replace(/character varying/g, 'varchar')
      .replace(/^serial$/, 'integer')
      .replace(/\s+/g, '')
  for (const table of Object.values(payload.db.tables)) {
    const name = getTableName(table)
    const actual = await client.query<{ column_name: string; sql_type: string; not_null: boolean }>(
      `SELECT a.attname AS column_name, format_type(a.atttypid, a.atttypmod) AS sql_type, a.attnotnull AS not_null
       FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attname`,
      ['public', name],
    )
    const columns = Object.values(getTableColumns(table)) as {
      name: string
      notNull: boolean
      getSQLType: () => string
      enumValues?: string[]
    }[]
    const expected = columns.map((column) => column.name).sort()
    assert.deepEqual(
      actual.rows.map((row) => row.column_name),
      expected,
      `Payload configuration and migrated columns differ: ${name}`,
    )
    for (const column of columns) {
      const row = actual.rows.find((item) => item.column_name === column.name)!
      assert.equal(
        normalizeType(row.sql_type),
        normalizeType(column.getSQLType()),
        `Column type differs: ${name}.${column.name}`,
      )
      assert.equal(
        row.not_null,
        column.notNull,
        `Column nullability differs: ${name}.${column.name}`,
      )
      if (column.enumValues?.length) {
        const values = await client.query<{ enumlabel: string }>(
          'SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder',
          [column.getSQLType().replace(/"/g, '')],
        )
        assert.deepEqual(
          values.rows.map((item) => item.enumlabel),
          column.enumValues,
          `Enum differs: ${name}.${column.name}`,
        )
      }
    }
    const tableConfig = getTableConfig(table)
    const indexes = await client.query<{ indexname: string; indexdef: string }>(
      'SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2',
      ['public', name],
    )
    for (const index of tableConfig.indexes) {
      const actualIndex = indexes.rows.find((item) => item.indexname === index.config.name)
      assert(actualIndex, `Missing configured index: ${name}.${index.config.name}`)
      if (index.config.unique) assert.match(actualIndex.indexdef, /CREATE UNIQUE INDEX/)
    }
    const foreignKeys = await client.query<{ conname: string }>(
      "SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'f'",
      [`public.${name}`],
    )
    for (const foreignKey of tableConfig.foreignKeys)
      assert(
        foreignKeys.rows.some((item) => item.conname === foreignKey.getName()),
        `Missing foreign key: ${foreignKey.getName()}`,
      )
  }
  const constraints = await client.query(
    "SELECT indexdef FROM pg_indexes WHERE tablename = 'posts'",
  )
  assert(
    constraints.rows.some((row) => /UNIQUE.*slug/.test(row.indexdef)),
    'Post slug must have a unique index.',
  )
  await client.query('SELECT storage_prefix, entry_file, manifest, _status FROM snippets LIMIT 0')
  console.log('Payload tables and embed-server SQL contract verified.')
} finally {
  await client.end()
  await payload.destroy()
}
process.exit(0)
