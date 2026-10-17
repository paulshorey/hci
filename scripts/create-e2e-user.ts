import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { required } from '../src/lib/env'
if (!new URL(required('DB_HCI_URL')).pathname.endsWith('_test'))
  throw new Error('E2E accounts require a disposable test database.')
const payload = await getPayload({ config })
try {
  const owner = await payload.create({
    collection: 'users',
    data: {
      name: 'Browser test administrator',
      email: required('HCI_E2E_EMAIL'),
      password: required('HCI_E2E_PASSWORD'),
      role: 'admin',
    },
  })
  await payload.create({
    collection: 'users',
    user: { ...owner, collection: 'users' },
    data: {
      name: 'Browser test editor',
      email: required('HCI_E2E_EDITOR_EMAIL'),
      password: required('HCI_E2E_EDITOR_PASSWORD'),
      role: 'editor',
    },
  })
} finally {
  await payload.destroy()
}
process.exit(0)
