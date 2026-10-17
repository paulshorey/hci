import type { Block } from 'payload'
import {
  captionFields,
  httpsURL,
  imageFields,
  sourceField,
  videoFields,
} from '@/lib/content/fields'

export const contentBlocks: Block[] = [
  {
    slug: 'richText',
    interfaceName: 'TextBlock',
    fields: [{ name: 'body', type: 'richText', required: true }],
  },
  { slug: 'image', interfaceName: 'ImageBlock', fields: imageFields() },
  { slug: 'video', interfaceName: 'VideoBlock', fields: videoFields() },
  {
    slug: 'link',
    interfaceName: 'LinkBlock',
    fields: [
      { name: 'url', type: 'text', required: true, validate: httpsURL },
      { name: 'label', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      sourceField(),
    ],
  },
  {
    slug: 'download',
    interfaceName: 'DownloadBlock',
    fields: [
      { name: 'media', type: 'upload', relationTo: 'media', required: true },
      { name: 'label', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      sourceField(),
    ],
  },
  {
    slug: 'embed',
    interfaceName: 'EmbedBlock',
    fields: [
      { name: 'snippet', type: 'relationship', relationTo: 'snippets', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'height', type: 'number', required: true, defaultValue: 420, min: 160, max: 1600 },
      ...captionFields(),
    ],
  },
]
