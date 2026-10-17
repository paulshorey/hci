import type { CollectionConfig } from 'payload'
import { admin, editor } from '@/lib/content/access'
import { slugField } from '@/lib/content/fields'

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
