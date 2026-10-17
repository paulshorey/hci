import type { CollectionConfig } from 'payload'
import { editorialAccess } from '@/lib/content/access'
import { captureDraftSave, protectDeletion, protectPublication } from '@/lib/content/references'

export const Snippets: CollectionConfig = {
  slug: 'snippets',
  admin: {
    useAsTitle: 'title',
    description:
      'Import a ZIP at /bundles/import, or use pnpm snippets:import. Files are immutable; import an update as a new version.',
    preview: (doc) => `/snippet-preview?id=${doc.id}`,
  },
  access: editorialAccess,
  versions: { drafts: true, maxPerDoc: 20 },
  hooks: {
    beforeOperation: [captureDraftSave],
    beforeDelete: [protectDeletion('snippets')],
    beforeChange: [
      protectPublication('snippets'),
      ({ data, originalDoc, operation, context }) => {
        const immutable = ['storagePrefix', 'entryFile', 'manifest', 'bundleVersion']
        if (operation === 'create' && !context.bundleImport)
          throw new Error('Create bundles through the validated bundle importer.')
        if (
          operation === 'update' &&
          immutable.some(
            (key) => key in data && JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]),
          )
        )
          throw new Error('Bundle files are immutable. Import a new version instead.')
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    {
      name: 'storagePrefix',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true },
    },
    { name: 'bundleVersion', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'entryFile', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'manifest', type: 'json', required: true, admin: { readOnly: true } },
  ],
}
