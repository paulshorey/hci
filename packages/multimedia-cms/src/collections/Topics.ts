import type { CollectionConfig } from 'payload'
import { admin, editor } from '@multimedia/cms/lib/content/access'
import { slugField } from '@multimedia/cms/lib/content/fields'

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'title' },
  access: { read: () => true, create: editor, update: editor, delete: admin },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField(),
    { name: 'description', type: 'textarea' },
  ],
}
