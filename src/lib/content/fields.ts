import type { Field } from 'payload'

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  validate: (value: unknown) =>
    typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
      ? true
      : 'Use lowercase letters, numbers, and single hyphens.',
})

export const httpsURL = (value: unknown): true | string => {
  if (!value) return true
  try {
    if (typeof value !== 'string' || new URL(value).protocol !== 'https:') throw new Error()
    return true
  } catch {
    return 'Enter an absolute HTTPS URL.'
  }
}

export const sourceField = (): Field => ({
  name: 'source',
  type: 'relationship',
  relationTo: 'sources',
})

export const captionFields = (): Field[] => [
  {
    name: 'caption',
    type: 'textarea',
    admin: { description: 'Shown immediately below this media. Required when publishing.' },
  },
  sourceField(),
]

export const imageFields = (): Field[] => [
  {
    name: 'media',
    type: 'upload',
    relationTo: 'media',
    required: true,
    filterOptions: { mimeType: { like: 'image/' } },
  },
  {
    name: 'alt',
    type: 'text',
    admin: { description: 'Describe the image for readers who cannot see it.' },
  },
  ...captionFields(),
]

export const videoFields = (): Field[] => [
  {
    name: 'sourceType',
    type: 'select',
    required: true,
    defaultValue: 'upload',
    options: ['upload', 'external'],
  },
  {
    name: 'media',
    type: 'upload',
    relationTo: 'media',
    filterOptions: { mimeType: { like: 'video/' } },
    admin: { condition: (_, sibling) => sibling.sourceType !== 'external' },
  },
  {
    name: 'url',
    type: 'text',
    validate: httpsURL,
    admin: {
      description: 'HTTPS MP4/WebM, YouTube, or Vimeo URL.',
      condition: (_, sibling) => sibling.sourceType === 'external',
    },
  },
  {
    name: 'poster',
    type: 'upload',
    relationTo: 'media',
    filterOptions: { mimeType: { like: 'image/' } },
  },
  { name: 'transcript', type: 'textarea' },
  ...captionFields(),
]
