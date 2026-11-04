import type { CollectionConfig } from 'payload'
import { editorialAccess } from '../lib/content/access'
import { slugField } from '../lib/content/fields'
import { prepareEntryLists, reconcileEntryLists, reconcileDeletedEntry } from '../lib/content/lists'
import { validatePublication } from '../lib/content/publication'
import { captureDraftSave } from '../lib/content/references'

export const Entries: CollectionConfig = {
  slug: 'entries',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug', 'publishedAt', '_status'],
    preview: (doc) => `/preview?slug=${encodeURIComponent(String(doc.slug))}`,
  },
  access: {
    ...editorialAccess,
    read: ({ req }) =>
      req.user ? true : { _status: { equals: 'published' }, visibility: { equals: 'public' } },
  },
  versions: { drafts: { autosave: { interval: 1500 }, schedulePublish: true }, maxPerDoc: 50 },
  hooks: {
    beforeOperation: [captureDraftSave],
    beforeValidate: [prepareEntryLists],
    beforeChange: [validatePublication],
    afterChange: [reconcileEntryLists],
    afterDelete: [reconcileDeletedEntry],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    {
      name: 'summary',
      label: 'Short description',
      type: 'textarea',
      admin: { description: 'Optional description for cards, search and feeds.' },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        { label: 'Public website', value: 'public' },
        { label: 'Editorial team only', value: 'private' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'contentLists',
      type: 'relationship',
      relationTo: 'content-lists',
      hasMany: true,
      required: true,
      minRows: 1,
      label: 'Content',
      admin: { components: { Field: '@multimedia/cms/admin#ContentListsField' } },
    },
    {
      type: 'collapsible',
      label: 'Organization and publishing',
      fields: [
        { name: 'kind', type: 'text', defaultValue: 'article', index: true },
        { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
        { name: 'sources', type: 'relationship', relationTo: 'sources', hasMany: true },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          access: { read: ({ req }) => Boolean(req.user) },
        },
        {
          name: 'byline',
          type: 'text',
          admin: { description: 'Public author name; CMS accounts remain private.' },
        },
        { name: 'publishedAt', type: 'date', index: true },
      ],
    },
    {
      type: 'collapsible',
      label: 'Search and sharing',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'seo',
          type: 'group',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'description', type: 'textarea' },
          ],
        },
      ],
    },
  ],
}
