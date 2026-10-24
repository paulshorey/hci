import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
} from 'payload'
import { isDeepStrictEqual } from 'node:util'
import type { ContentList } from '@multimedia/cms/types'
import { blockReferences } from '../../blocks'
import { relationID } from './values'
import { lockPublishedContent } from './transactions'

type Kind = 'media' | 'snippets' | 'sources'
const same = (value: unknown, id: string | number) => String(relationID(value)) === String(id)

function references(list: ContentList, kind: Kind, id: string | number) {
  return (list.items || []).some((item) =>
    (item.content || []).some((block) =>
      blockReferences(block).some((ref) => ref.collection === kind && same(ref.value, id)),
    ),
  )
}

export async function rejectPublishedReferences(
  req: PayloadRequest,
  kind: Kind,
  id: string | number,
  includeHistory = false,
) {
  await lockPublishedContent(req)
  let page = 1
  while (true) {
    const result = await req.payload.find({
      collection: 'content-lists',
      req,
      overrideAccess: true,
      depth: 0,
      limit: 100,
      page,
      where: includeHistory ? { sealed: { equals: true } } : { public: { equals: true } },
    })
    const list = result.docs.find((list) => references(list, kind, id))
    if (list)
      throw new APIError(
        `This item is used by published or saved content “${list.title || 'Content'}”. Remove the reference or unpublish its entries first.`,
        400,
      )
    if (!result.hasNextPage) break
    page++
  }
  if (kind === 'media') {
    const source = await req.payload.find({
      collection: 'sources',
      req,
      overrideAccess: true,
      draft: false,
      depth: 0,
      limit: 1,
      where: { and: [{ _status: { equals: 'published' } }, { attachments: { equals: id } }] },
      select: { title: true },
    })
    if (source.docs[0])
      throw new APIError(
        `This item is attached to the published source “${source.docs[0].title}”. Remove the attachment or unpublish the source first.`,
        400,
      )
    const site = await req.payload.findGlobal({
      slug: 'site-settings',
      req,
      overrideAccess: true,
      depth: 0,
    })
    if (same(site.logo, id))
      throw new APIError('This image is the site logo. Choose another logo first.', 400)
  }
}

export const captureDraftSave: CollectionBeforeOperationHook = ({
  args,
  collection,
  operation,
  req,
}) => {
  if (operation === 'update')
    req.context[`draftSave:${collection.slug}`] = 'draft' in args && args.draft === true
}

const fileProperties = [
  'filename',
  'mimeType',
  'filesize',
  'width',
  'height',
  'focalX',
  'focalY',
  'sizes',
  'prefix',
  '_objectKey',
] as const

export const protectMediaReplacement: CollectionBeforeOperationHook = async ({
  args,
  operation,
  overrideAccess,
  req,
}) => {
  if (operation !== 'update' || (!overrideAccess && !req.user) || !('data' in args)) return
  const data = args.data as Record<string, unknown>
  const uploadEdits = req.query?.uploadEdits
  const editsFile =
    Boolean(req.file) ||
    (typeof uploadEdits === 'object' && uploadEdits !== null && Object.keys(uploadEdits).length > 0)
  if (!editsFile && !fileProperties.some((key) => key in data)) return
  const where =
    'id' in args && args.id ? { id: { equals: args.id } } : 'where' in args && args.where
  if (!where) return
  // This must run before generateFileData/updateDocument. Payload deletes the
  // previous disk files before beforeValidate, and writes files before beforeChange.
  await lockPublishedContent(req)
  let page = 1
  while (true) {
    const result = await req.payload.find({
      collection: 'media',
      req,
      overrideAccess: true,
      where,
      depth: 0,
      limit: 100,
      page,
    })
    for (const file of result.docs) {
      const stored = file as unknown as Record<string, unknown>
      if (
        editsFile ||
        fileProperties.some((key) => key in data && !isDeepStrictEqual(data[key], stored[key]))
      )
        await rejectPublishedReferences(req, 'media', file.id, true)
    }
    if (!result.hasNextPage) break
    page++
  }
}

export const protectPublication =
  (kind: 'sources' | 'snippets'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req, operation }) => {
    if (operation === 'update' && data._status === 'draft' && !req.context[`draftSave:${kind}`])
      await rejectPublishedReferences(req, kind, originalDoc.id)
    return data
  }

export const protectDeletion =
  (kind: Kind): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await rejectPublishedReferences(req, kind, id, true)
  }
