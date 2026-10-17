import 'dotenv/config'
import { createServer } from 'node:http'
import { Pool } from 'pg'
import { embedOrigin, required, siteURL } from '../../src/lib/env'
import { objectStorage } from '../../src/lib/storage/index'
import { embedHandler, type BundleDescriptor } from './handler'

embedOrigin()
const pool = new Pool({
  connectionString: required('DB_HCI_URL'),
  max: 5,
  connectionTimeoutMillis: 10000,
})
const server = createServer(
  embedHandler({
    storage: objectStorage(),
    siteOrigin: siteURL(),
    lookup: async (id) =>
      (
        await pool.query<BundleDescriptor>(
          'SELECT storage_prefix, entry_file, manifest, _status FROM snippets WHERE id = $1',
          [id],
        )
      ).rows[0] || null,
    health: async () => {
      await pool.query('SELECT storage_prefix, entry_file, manifest, _status FROM snippets LIMIT 0')
    },
  }),
)
server.requestTimeout = 30000
server.listen(
  Number(process.env.PORT || process.env.EMBED_PORT || 4501),
  process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
  () => console.log('Embed server ready'),
)
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0))
    })
  })
