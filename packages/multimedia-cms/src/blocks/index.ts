import type { Block } from 'payload'
import {
  captionFields,
  httpsURL,
  imageFields,
  sourceField,
  videoFields,
} from '@multimedia/cms/lib/content/fields'

export const contentBlocks: Block[] = [
  {
    slug: 'richText',
    interfaceName: 'TextBlock',
    fields: [{ name: 'body', type: 'richText', required: true }],
  },
  { slug: 'image', interfaceName: 'ImageBlock', fields: imageFields() },
  { slug: 'video', interfaceName: 'VideoBlock', fields: videoFields() },
  {
    slug: 'audio',
    interfaceName: 'AudioBlock',
    fields: [
      {
        name: 'media',
        type: 'upload',
        relationTo: 'media',
        required: true,
        filterOptions: { mimeType: { like: 'audio/' } },
      },
      { name: 'transcript', type: 'textarea' },
      ...captionFields(),
    ],
  },
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

export interface ContentReference {
  collection: 'media' | 'sources' | 'snippets'
  value: unknown
  mime?: string
}
// Relationships are derived from the owning Payload fields rather than a second list of paths.
export function blockReferences(block: { blockType: string }): ContentReference[] {
  const definition = contentBlocks.find((type) => type.slug === block.blockType)
  if (!definition) throw new Error(`Unsupported content type: ${block.blockType}`)
  const values = block as unknown as Record<string, unknown>
  return definition.fields.flatMap((field) => {
    if (
      !('name' in field) ||
      (field.type !== 'upload' && field.type !== 'relationship') ||
      typeof field.relationTo !== 'string' ||
      !['media', 'sources', 'snippets'].includes(field.relationTo)
    )
      return []
    if (block.blockType === 'video' && field.name === 'media' && values.sourceType === 'external')
      return []
    const collection = field.relationTo as ContentReference['collection']
    const mime =
      collection === 'media'
        ? field.name === 'poster' || block.blockType === 'image'
          ? 'image/'
          : block.blockType === 'video'
            ? 'video/'
            : block.blockType === 'audio'
              ? 'audio/'
              : undefined
        : undefined
    const value = values[field.name]
    return (Array.isArray(value) ? value : [value]).map((item) => ({
      collection,
      value: item,
      mime,
    }))
  })
}
