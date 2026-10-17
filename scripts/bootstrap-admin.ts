import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { required } from '../src/lib/env'

const payload = await getPayload({ config })
try {
  const existing = await payload.count({ collection: 'users', overrideAccess: true })
  if (existing.totalDocs) {
    const administrators = await payload.count({
      collection: 'users',
      overrideAccess: true,
      where: { role: { equals: 'admin' } },
    })
    if (!administrators.totalDocs) throw new Error('The CMS has users but no administrator.')
    console.log('CMS administrator already exists; accounts are unchanged.')
  } else {
    const password = required('CMS_BOOTSTRAP_PASSWORD')
    if (password.length < 32)
      throw new Error('CMS_BOOTSTRAP_PASSWORD must have at least 32 characters.')
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      data: {
        name: 'Site administrator',
        email: required('CMS_BOOTSTRAP_EMAIL'),
        password,
        role: 'admin',
      },
    })
    console.log('Created the first CMS administrator. Credentials were not logged.')
  }
} finally {
  await payload.destroy()
}
process.exit(0)
