import { APIError, type CollectionBeforeChangeHook } from 'payload'
import type { Post } from '@/generated/payload-types'
import { lockPublishedContent } from './transactions'

export function relationID(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID(value.id)
  return null
}

export function externalVideo(value: string): { kind: 'file' | 'iframe'; url: string } | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    let id: string | null = null
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/shorts\/([\w-]+)$/)?.[1] || null
    } else if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
    if (id && /^[\w-]{11}$/.test(id))
      return { kind: 'iframe', url: `https://www.youtube-nocookie.com/embed/${id}` }
    if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname) && /^\/\d+$/.test(url.pathname))
      return { kind: 'iframe', url: `https://player.vimeo.com/video/${url.pathname.slice(1)}` }
    if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: 'file', url: url.href }
    return null
  } catch {
    return null
  }
}

export const validatePublication: CollectionBeforeChangeHook<Post> = async ({
  data,
  originalDoc,
  req,
}) => {
  const post = { ...originalDoc, ...data } as Partial<Post>
  if (post._status !== 'published') return data
  await lockPublishedContent(req)
  const fail = (message: string): never => {
    throw new APIError(message, 400)
  }
  const checked = new Map<string, Promise<void>>()
  const check = (
    collection: 'media' | 'snippets' | 'sources',
    ref: unknown,
    mimePrefix?: string,
  ): Promise<void> => {
    const id = relationID(ref)
    if (id === null) return Promise.resolve()
    const key = `${collection}:${id}:${mimePrefix || ''}`
    if (!checked.has(key))
      checked.set(
        key,
        (async () => {
          const doc = await req.payload.findByID({
            collection,
            id,
            req,
            overrideAccess: true,
            depth: 0,
          })
          if (collection === 'media') {
            if (!('visibility' in doc) || doc.visibility !== 'public')
              fail('Publish referenced media before publishing the post.')
            if (mimePrefix && (!('mimeType' in doc) || !doc.mimeType?.startsWith(mimePrefix)))
              fail(`Expected a ${mimePrefix} media file.`)
            if (
              mimePrefix === 'video/' &&
              'mimeType' in doc &&
              !['video/mp4', 'video/webm'].includes(doc.mimeType || '')
            )
              fail(
                'Use browser-ready MP4 or WebM for playback; attach other video originals as downloads.',
              )
          } else if (!('_status' in doc) || doc._status !== 'published')
            fail(`Publish the referenced ${collection} document first.`)
        })(),
      )
    return checked.get(key)!
  }
  const caption = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim())
      fail('Every published image, video, audio, and embed needs a caption.')
  }
  const image = async (value: NonNullable<Post['featuredImage']>) => {
    caption(value.caption)
    if (!value.alt?.trim()) fail('Every published image needs alt text.')
    await check('media', value.media, 'image/')
    await check('sources', value.source)
  }
  const video = async (value: NonNullable<Post['featuredVideo']>) => {
    caption(value.caption)
    if (value.sourceType === 'external') {
      if (!value.url || !externalVideo(value.url))
        fail('Use an HTTPS MP4/WebM URL, YouTube URL, or Vimeo URL.')
    } else {
      if (!relationID(value.media)) fail('An uploaded video needs a media file.')
      await check('media', value.media, 'video/')
    }
    await check('media', value.poster, 'image/')
    await check('sources', value.source)
  }
  if (relationID(post.featuredImage?.media)) await image(post.featuredImage!)
  if (relationID(post.featuredVideo?.media) || post.featuredVideo?.url)
    await video(post.featuredVideo!)
  if (relationID(post.featuredSnippet)) {
    caption(post.featuredSnippetCaption)
    await check('snippets', post.featuredSnippet)
    await check('sources', post.featuredSnippetSource)
  }
  for (const source of post.sources || []) await check('sources', source)
  for (const slide of post.slides || []) {
    if (!slide.content?.length) fail('Published slides must contain at least one content block.')
    for (const block of slide.content) {
      if (block.blockType === 'image') await image(block)
      if (block.blockType === 'video') await video(block)
      if (block.blockType === 'audio') {
        caption(block.caption)
        await check('media', block.media, 'audio/')
      }
      if (block.blockType === 'download') await check('media', block.media)
      if (block.blockType === 'embed') {
        caption(block.caption)
        await check('snippets', block.snippet)
      }
      if ('source' in block) await check('sources', block.source)
    }
  }
  if (!post.publishedAt) data.publishedAt = new Date().toISOString()
  return data
}
