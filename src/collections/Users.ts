import type { CollectionConfig } from 'payload'
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
      (await req.payload.count({ collection: 'users', overrideAccess: true })).totalDocs === 0,
    update: ({ req }) =>
      req.user?.role === 'admin' ? true : { id: { equals: req.user?.id || 0 } },
    delete: admin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (
          operation === 'create' &&
          (await req.payload.count({ collection: 'users', overrideAccess: true, req }))
            .totalDocs === 0
        )
          data.role = 'admin'
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
      access: { update: adminField },
    },
  ],
}
