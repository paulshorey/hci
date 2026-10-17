/* eslint-disable @next/next/no-img-element -- Payload controls file access and creates image derivatives; avoid an unauthenticated optimizer cache for private previews. */
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Post, Media, Source, Snippet } from '@/generated/payload-types'
import { embedOrigin } from '@/lib/env'
import { externalVideo } from '@/lib/content/publication'
import { previewToken } from '@/lib/snippets/tokens'
import { VisibilityFrame } from './VisibilityFrame'

export const mediaDocument = (value: unknown): Media | null =>
  value && typeof value === 'object' && 'url' in value ? (value as Media) : null
const sourceDocument = (value: unknown): Source | null =>
  value && typeof value === 'object' && 'url' in value ? (value as Source) : null

export function Citation({ source }: { source?: unknown }) {
  const doc = sourceDocument(source)
  return doc ? (
    <a className="citation" href={doc.url} target="_blank" rel="noopener noreferrer">
      Source: {doc.publisher || doc.title} ↗
    </a>
  ) : null
}

export function Caption({ caption, source }: { caption?: string | null; source?: unknown }) {
  return (
    <figcaption>
      {caption && <span>{caption}</span>}
      <Citation source={source} />
    </figcaption>
  )
}

export function ImageContent({
  value,
  card = false,
}: {
  value: NonNullable<Post['featuredImage']>
  card?: boolean
}) {
  const media = mediaDocument(value.media)
  if (!media?.url) return <p className="unavailable">Image unavailable.</p>
  return (
    <figure className={card ? 'media-figure card-image' : 'media-figure'}>
      <img
        src={(card && media.sizes?.card?.url) || media.url}
        alt={value.alt || media.alt || ''}
        width={media.width || undefined}
        height={media.height || undefined}
        loading="lazy"
      />
      {!card && <Caption caption={value.caption} source={value.source} />}
    </figure>
  )
}

export function VideoContent({ value }: { value: NonNullable<Post['featuredVideo']> }) {
  const file = mediaDocument(value.media)
  const external = value.sourceType === 'external' && value.url ? externalVideo(value.url) : null
  const poster = mediaDocument(value.poster)
  const src = external?.url || file?.url
  return (
    <figure className="media-figure">
      {src ? (
        external?.kind === 'iframe' ? (
          <VisibilityFrame src={src} title={value.caption || 'Video'} />
        ) : (
          <video
            src={src}
            controls
            playsInline
            preload="none"
            poster={poster?.url || undefined}
            aria-label={value.caption || 'Video'}
          />
        )
      ) : (
        <p className="unavailable">Video unavailable.</p>
      )}
      <Caption caption={value.caption} source={value.source} />
      {value.transcript && (
        <details className="transcript">
          <summary>Read transcript</summary>
          <p>{value.transcript}</p>
        </details>
      )}
    </figure>
  )
}

export function SnippetContent({
  value,
  title,
  caption,
  source,
  height,
  preview,
}: {
  value: number | Snippet | null | undefined
  title: string
  caption?: string | null
  source?: unknown
  height?: number
  preview: boolean
}) {
  if (!value || typeof value !== 'object')
    return <p className="unavailable">Interactive content unavailable.</p>
  const prefix = preview ? `/preview/${previewToken(value.id)}/${value.id}` : `/bundles/${value.id}`
  return (
    <figure className="media-figure interactive">
      <VisibilityFrame
        src={`${embedOrigin()}${prefix}/${value.entryFile}`}
        title={title}
        height={height}
        sandbox="allow-scripts allow-same-origin"
      />
      <Caption caption={caption} source={source} />
    </figure>
  )
}

export function ContentBlock({
  block,
  preview,
}: {
  block: NonNullable<Post['slides']>[number]['content'][number]
  preview: boolean
}) {
  switch (block.blockType) {
    case 'richText':
      return (
        <div className="prose">
          <RichText data={block.body} />
        </div>
      )
    case 'image':
      return <ImageContent value={block} />
    case 'video':
      return <VideoContent value={block} />
    case 'embed':
      return (
        <SnippetContent
          value={block.snippet}
          title={block.title}
          caption={block.caption}
          source={block.source}
          height={block.height}
          preview={preview}
        />
      )
    case 'link':
      return (
        <aside className="resource-link">
          <span className="eyebrow">Reference</span>
          <a href={block.url} target="_blank" rel="noopener noreferrer">
            {block.label} ↗
          </a>
          {block.description && <p>{block.description}</p>}
          <Citation source={block.source} />
        </aside>
      )
    case 'download': {
      const media = mediaDocument(block.media)
      return (
        <aside className="resource-link">
          <span className="eyebrow">Download</span>
          {media?.url ? (
            <a href={media.url} download>
              {block.label} ↓
            </a>
          ) : (
            <span>File unavailable</span>
          )}
          {block.description && <p>{block.description}</p>}
          <Citation source={block.source} />
        </aside>
      )
    }
  }
}
