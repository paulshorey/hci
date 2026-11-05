import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { objectStorage } from '@multimedia/cms/lib/storage'
import { storageDriver } from '@multimedia/cms/lib/env'

const storage = objectStorage()
const key = `probes/${randomUUID()}/check.txt`
const bytes = Buffer.from('HCI storage access verification')
let written = false
let phase = 'write'
try {
  await storage.write(key, bytes, 'text/plain')
  written = true
  phase = 'read'
  if (!(await storage.read(key)).equals(bytes)) throw new Error('IntegrityMismatch')
  phase = 'delete'
  await storage.remove(key)
  written = false
  console.log(
    `Storage check passed (${storageDriver()}): wrote, read and removed an isolated probe.`,
  )
} catch (error) {
  console.error(
    `Storage check failed during ${phase} (${error instanceof Error ? error.name : 'UnknownError'}). Check the scoped credentials and bucket configuration.`,
  )
  process.exitCode = 1
} finally {
  if (written) {
    try {
      await storage.remove(key)
    } catch {
      console.error(`Probe cleanup failed; remove only ${key} after restoring access.`)
    }
  }
}
