import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { required } from '../src/lib/env'
if (!new URL(required('DATABASE_URL')).pathname.endsWith('_test'))
  throw new Error('E2E accounts require a disposable test database.')
const payload = await getPayload({ config })
try {
  await payload.create({
    collection: 'users',
    data: {
      name: 'Browser test editor',
      email: required('HCI_E2E_EMAIL'),
      password: required('HCI_E2E_PASSWORD'),
      role: 'admin',
    },
  })
} finally {
  await payload.destroy()
}
process.exit(0)
