import { migrate } from '../../scripts/migrate'
import { migrations } from '../../src/migrations/index'
import { required } from '../../src/lib/env'
const database = new URL(required('DATABASE_URL'))
if (
  !['127.0.0.1', 'localhost', 'postgres'].includes(database.hostname) ||
  !database.pathname.endsWith('_test')
)
  throw new Error('Migration fixtures require a disposable local test database.')
const count = Number(process.argv[2] || 1)
if (!Number.isInteger(count) || count < 1 || count > migrations.length)
  throw new Error('Invalid fixture migration count.')
await migrate(migrations.slice(0, count))
process.exit(0)
