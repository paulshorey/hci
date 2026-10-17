import type { CollectionConfig } from 'payload'
import { editorialAccess } from '@/lib/content/access'
import { httpsURL } from '@/lib/content/fields'
import { captureDraftSave, protectDeletion, protectPublication } from '@/lib/content/references'
import { validateSourcePublication } from '@/lib/content/source-publication'

export const Sources: CollectionConfig = {
  slug: 'sources',
  admin: {
    group: 'Library',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publisher', 'accessedAt', '_status'],
    description:
      'Record a web source, your own uploaded evidence, or both. Research notes stay private.',
  },
  access: editorialAccess,
  versions: { drafts: true, maxPerDoc: 30 },
  hooks: {
    beforeOperation: [captureDraftSave],
    beforeChange: [protectPublication('sources'), validateSourcePublication],
    beforeDelete: [protectDeletion('sources')],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'url', type: 'text', validate: httpsURL },
    {
      name: 'attachments',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description:
          'Public evidence files, such as screenshots, recordings, original PDFs, datasets or ZIPs. A published source needs a URL or at least one public attachment.',
      },
    },
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
