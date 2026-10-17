import path from 'node:path'
import type { CollectionConfig } from 'payload'
import { admin, editor, publicMedia } from '@/lib/content/access'
import { httpsURL, sourceField } from '@/lib/content/fields'
import { storageRoot } from '@/lib/env'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: publicMedia, create: editor, update: editor, delete: admin },
  upload: {
    staticDir: path.join(storageRoot(), 'media'),
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'video/mp4',
      'video/webm',
      'application/pdf',
      'text/plain',
      'application/zip',
    ],
    imageSizes: [{ name: 'card', width: 960, height: 600, position: 'centre' }],
    adminThumbnail: 'card',
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'alt', type: 'text' },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'private',
      options: ['private', 'public'],
      admin: {
        description:
          'Private files require CMS authentication. Publish only files intended for public delivery.',
      },
    },
    { name: 'credit', type: 'text' },
    sourceField(),
    { name: 'creditURL', type: 'text', validate: httpsURL },
    {
      name: 'license',
      type: 'text',
      admin: { description: 'Rights or license information for this file.' },
    },
  ],
}
