import { APIError, type CollectionBeforeChangeHook } from 'payload'
import type { Source } from '@multimedia/cms/types'
import { relationID } from './publication'
import { lockPublishedContent } from './transactions'

export const validateSourcePublication: CollectionBeforeChangeHook<Source> = async ({
  data,
  originalDoc,
  req,
}) => {
  const source = { ...originalDoc, ...data }
  if (source._status !== 'published') return data
  await lockPublishedContent(req)
  if (!source.url?.trim() && !source.attachments?.length)
    throw new APIError('A published source needs a URL or an uploaded evidence file.', 400)
  for (const ref of source.attachments || []) {
    const id = relationID(ref)
    if (!id) throw new APIError('Select a valid evidence file.', 400)
    const file = await req.payload.findByID({
      collection: 'media',
      id,
      req,
      overrideAccess: true,
      depth: 0,
    })
    if (file.visibility !== 'public')
      throw new APIError('Make source attachments public before publishing the source.', 400)
  }
  return data
}
