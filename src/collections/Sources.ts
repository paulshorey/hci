import type { CollectionConfig } from 'payload'
import { editorialAccess } from '@/lib/content/access'
import { httpsURL } from '@/lib/content/fields'

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publisher', 'accessedAt', '_status'] },
  access: editorialAccess,
  versions: { drafts: true, maxPerDoc: 30 },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'url', type: 'text', required: true, validate: httpsURL },
    { name: 'publisher', type: 'text' },
    { name: 'author', type: 'text' },
    { name: 'publishedAt', type: 'date' },
    {
      name: 'accessedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    { name: 'archiveURL', type: 'text', validate: httpsURL },
    {
      name: 'notes',
      type: 'textarea',
      access: { read: ({ req }) => Boolean(req.user) },
      admin: { description: 'Private editorial research notes; excluded from public delivery.' },
    },
  ],
}
