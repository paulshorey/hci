import { migrate } from '../../scripts/migrate'
import { migrations } from '../../src/migrations/index'
await migrate(migrations.slice(0, 1))
process.exit(0)
