import type { CollectionConfig } from 'payload'
import { editorialAccess } from '@/lib/content/access'
import { captureDraftSave, protectDeletion, protectPublication } from '@/lib/content/references'

export const Snippets: CollectionConfig = {
  slug: 'snippets',
  admin: {
    useAsTitle: 'title',
    group: 'Library',
    components: { beforeList: ['/components/EditorialLinks#BundleLibraryHelp'] },
    description:
      'Use Import an interactive ZIP to add a bundle. Each import keeps its original files; import revisions separately, then select the version in your article.',
    preview: (doc) => `/snippet-preview?id=${doc.id}`,
  },
  access: {
    ...editorialAccess,
    create: ({ req }) => Boolean(req.user) && req.context.bundleImport === true,
  },
  disableDuplicate: true,
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
    {
      type: 'collapsible',
      label: 'File manifest',
      admin: { initCollapsed: true },
      fields: [{ name: 'manifest', type: 'json', required: true, admin: { readOnly: true } }],
    },
  ],
}
