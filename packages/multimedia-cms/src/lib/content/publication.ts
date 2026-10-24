import { APIError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'
import type { ContentList } from '../../generated/payload-types'
import { blockReferences } from '../../blocks'
import { externalVideo, relationID } from './values'
import { listIDs } from './lists'
import { lockPublishedContent } from './transactions'
export { externalVideo, relationID } from './values'

export async function validateLists(
  req: PayloadRequest,
  lists: ContentList[],
  sources: unknown[] = [],
  publicDelivery = true,
) {
  const checked = new Set<string>()
  const check = async (
    collection: 'media' | 'sources' | 'snippets',
    ref: unknown,
    mime?: string,
  ) => {
    const id = relationID(ref)
    if (id === null) return
    const key = `${collection}:${id}:${mime || ''}`
    if (checked.has(key)) return
    const doc = await req.payload.findByID({
      collection,
      id,
      req,
      overrideAccess: true,
      depth: 0,
      draft: false,
    })
    if (collection === 'media') {
      if (publicDelivery && (!('visibility' in doc) || doc.visibility !== 'public'))
        throw new APIError('Make referenced media public before publishing the entry.', 400)
      if (mime && (!('mimeType' in doc) || !doc.mimeType?.startsWith(mime)))
        throw new APIError(`Expected a ${mime} media file.`, 400)
      if (
        mime === 'video/' &&
        'mimeType' in doc &&
        !['video/mp4', 'video/webm'].includes(doc.mimeType || '')
      )
        throw new APIError(
          'Use browser-ready MP4 or WebM; attach other originals as downloads.',
          400,
        )
    } else if (publicDelivery && (!('_status' in doc) || doc._status !== 'published'))
      throw new APIError(`Publish the referenced ${collection} document first.`, 400)
    checked.add(key)
  }
  for (const source of sources) await check('sources', source)
  for (const list of lists)
    for (const item of list.items || [])
      for (const block of item.content || []) {
        if (
          ['image', 'video', 'audio', 'embed'].includes(block.blockType) &&
          (!('caption' in block) || !block.caption?.trim())
        )
          throw new APIError(
            'Published images, videos, audio and interactive content need a caption.',
            400,
          )
        if (block.blockType === 'image' && !block.alt?.trim())
          throw new APIError('Published images need alt text.', 400)
        if (block.blockType === 'video') {
          if (block.sourceType === 'external' && (!block.url || !externalVideo(block.url)))
            throw new APIError('Use an HTTPS MP4/WebM, YouTube or Vimeo URL.', 400)
          if (block.sourceType !== 'external' && !relationID(block.media))
            throw new APIError('Select a video file.', 400)
        }
        for (const ref of blockReferences(block)) await check(ref.collection, ref.value, ref.mime)
      }
}
export const validatePublication: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const entry = { ...originalDoc, ...data }
  if (entry._status !== 'published' || req.context['draftSave:entries'] === true) return data
  await lockPublishedContent(req)
  const lists = await Promise.all(
    listIDs(entry.contentLists).map((id) =>
      req.payload.findByID({
        collection: 'content-lists',
        id,
        req,
        overrideAccess: true,
        depth: 0,
      }),
    ),
  )
  await validateLists(req, lists, entry.sources || [], entry.visibility !== 'private')
  if (!entry.publishedAt) data.publishedAt = new Date().toISOString()
  return data
}
