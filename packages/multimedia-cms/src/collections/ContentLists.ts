import { randomUUID } from 'node:crypto'
import { APIError, type CollectionConfig } from 'payload'
import { contentBlocks } from '../blocks'
import { admin, editor } from '../lib/content/access'
import { forkListEndpoint } from '../lib/content/lists'
import { lockPublishedContent } from '../lib/content/transactions'

export const ContentLists: CollectionConfig = {
  slug: 'content-lists',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    description: 'Edit content from its entry. Saved entry revisions preserve their content lists.',
    hidden: true,
  },
  access: {
    read: ({ req }) => (req.user ? true : { public: { equals: true } }),
    create: editor,
    update: editor,
    delete: admin,
  },
  endpoints: [forkListEndpoint],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        if (originalDoc?.id && data.key !== undefined) data.key = originalDoc.key
        const keys = new Set<string>()
        for (const item of data.items || []) {
          if (!item.key || keys.has(item.key)) item.key = randomUUID()
          keys.add(item.key)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        // Serialize sealing against edits, and re-read after the lock: originalDoc
        // may have been loaded before a concurrent entry attached this list.
        let sealed = originalDoc?.sealed
        if (operation === 'update') {
          await lockPublishedContent(req)
          const current = await req.payload.findByID({
            collection: 'content-lists',
            id: originalDoc.id,
            depth: 0,
            req,
            overrideAccess: true,
          })
          sealed = current.sealed
        }
        if (operation === 'update' && sealed)
          throw new APIError(
            'Saved content is immutable. Edit it from an entry to create a revision.',
            400,
          )
        if (data.public === true || data.sealed === true)
          throw new APIError('List publication is controlled by its entry.', 400)
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        await lockPublishedContent(req)
        const doc = await req.payload.findByID({
          collection: 'content-lists',
          id,
          req,
          overrideAccess: true,
          depth: 0,
        })
        if (doc.sealed)
          throw new APIError('This list belongs to entry history and cannot be deleted.', 400)
      },
    ],
  },
  fields: [
    { name: 'title', label: 'List title', type: 'text', defaultValue: 'Content' },
    {
      name: 'key',
      type: 'text',
      required: true,
      defaultValue: () => randomUUID(),
      admin: { hidden: true },
    },
    {
      name: 'presentation',
      type: 'select',
      required: true,
      defaultValue: 'flow',
      options: [
        { label: 'Continuous content', value: 'flow' },
        { label: 'Slideshow / carousel', value: 'carousel' },
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      interfaceName: 'ContentItems',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          defaultValue: () => randomUUID(),
          admin: { hidden: true },
        },
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
          label: 'Media and text',
          labels: { singular: 'Content block', plural: 'Content blocks' },
          type: 'blocks',
          blocks: contentBlocks,
        },
      ],
    },
    {
      name: 'sealed',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'public',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    },
  ],
}
