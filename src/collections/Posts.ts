import type { CollectionConfig } from 'payload'
import { contentBlocks } from '@/blocks'
import { editorialAccess } from '@/lib/content/access'
import { httpsURL, imageFields, slugField, videoFields } from '@/lib/content/fields'
import { validatePublication } from '@/lib/content/publication'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'publishedAt', '_status'],
    preview: (doc) => `/preview?slug=${encodeURIComponent(String(doc.slug))}`,
  },
  access: editorialAccess,
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  hooks: { beforeChange: [validatePublication] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Article',
          fields: [
            { name: 'title', type: 'text', required: true },
            slugField(),
            { name: 'summary', type: 'textarea', required: true },
            { name: 'body', type: 'richText' },
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
              admin: { description: 'Public author name; CMS account data remains private.' },
            },
            { name: 'publishedAt', type: 'date', index: true },
          ],
        },
        {
          label: 'Featured content',
          fields: [
            {
              name: 'featuredImage',
              type: 'group',
              fields: imageFields().map((field) =>
                'required' in field ? { ...field, required: false } : field,
              ),
            },
            {
              name: 'featuredVideo',
              type: 'group',
              fields: videoFields().map((field) =>
                'required' in field ? { ...field, required: false } : field,
              ),
            },
            { name: 'featuredLink', type: 'text', validate: httpsURL },
            { name: 'featuredSnippet', type: 'relationship', relationTo: 'snippets' },
          ],
        },
        {
          label: 'Slides',
          fields: [
            {
              name: 'slides',
              type: 'array',
              interfaceName: 'Slide',
              admin: { initCollapsed: true },
              fields: [
                { name: 'title', type: 'text' },
                {
                  name: 'layout',
                  type: 'select',
                  required: true,
                  defaultValue: 'stacked',
                  options: ['stacked', 'comparison'],
                },
                {
                  name: 'content',
                  type: 'blocks',
                  blocks: contentBlocks,
                  required: true,
                  minRows: 1,
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
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
    },
  ],
}
