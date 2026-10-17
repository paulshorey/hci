import { APIError, type CollectionConfig } from 'payload'
import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { admin, adminField } from '@/lib/content/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 8,
    lockTime: 600000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'email' },
  access: {
    read: ({ req }) => (req.user?.role === 'admin' ? true : { id: { equals: req.user?.id || 0 } }),
    create: async ({ req }) =>
      req.user?.role === 'admin' ||
      (await req.payload.count({ collection: 'users', overrideAccess: true, req })).totalDocs === 0,
    update: ({ req }) =>
      req.user?.role === 'admin' ? true : { id: { equals: req.user?.id || 0 } },
    delete: admin,
  },
  hooks: {
    beforeOperation: [
      async ({ operation, req }) => {
        if (operation !== 'create') return
        const transactionID = await req.transactionID
        const transaction = (transactionID &&
          req.payload.db.sessions?.[String(transactionID)]?.db) as MigrateUpArgs['db'] | undefined
        if (!transaction) throw new APIError('User creation requires a database transaction.', 500)
        // Payload starts this transaction before beforeOperation. The lock lasts
        // through insertion/login and commit, including native first-registration.
        await transaction.execute(sql`SELECT pg_advisory_xact_lock(728451603)`)
        const empty =
          (await req.payload.count({ collection: 'users', overrideAccess: true, req }))
            .totalDocs === 0
        if (!empty && req.user?.role !== 'admin')
          throw new APIError('Only an administrator can create additional accounts.', 403)
        req.context.hciInitialUser = empty
      },
    ],
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.context.hciInitialUser === true) data.role = 'admin'
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: ['admin', 'editor'],
      access: { create: adminField, update: adminField },
    },
  ],
}
