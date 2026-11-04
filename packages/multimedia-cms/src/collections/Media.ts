import path from 'node:path'
import type { CollectionConfig } from 'payload'
import {
  protectDeletion,
  protectMediaReplacement,
  rejectPublishedReferences,
} from '@multimedia/cms/lib/content/references'
import { admin, editor, publicMedia } from '@multimedia/cms/lib/content/access'
import { httpsURL, sourceField } from '@multimedia/cms/lib/content/fields'
import { storageRoot } from '@multimedia/cms/lib/env'

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  admin: {
    group: 'Library',
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'mimeType', 'filesize', 'visibility'],
    listSearchableFields: ['title', 'filename', 'credit', 'alt'],
    description:
      'Upload photos, video, audio, PDFs, documents, datasets or downloadable ZIP archives. Organize files into folders. For runnable HTML/CSS/JS folders, use Import an interactive ZIP in the navigation.',
  },
  access: { read: publicMedia, create: editor, update: editor, delete: admin },
  hooks: {
    beforeOperation: [protectMediaReplacement],
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (
          operation === 'update' &&
          originalDoc.visibility === 'public' &&
          data.visibility === 'private'
        )
          await rejectPublishedReferences(req, 'media', originalDoc.id)
        return data
      },
    ],
    beforeDelete: [protectDeletion('media')],
  },
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
      'video/quicktime',
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'application/pdf',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
