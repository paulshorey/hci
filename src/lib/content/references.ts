import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type PayloadRequest,
} from 'payload'
import type { Post } from '@/generated/payload-types'
import { relationID } from './publication'
import { lockPublishedContent } from './transactions'

type Kind = 'media' | 'snippets' | 'sources'
const same = (value: unknown, id: string | number) => String(relationID(value)) === String(id)

function references(post: Partial<Post>, kind: Kind, id: string | number) {
  if (
    kind === 'media' &&
    [post.featuredImage?.media, post.featuredVideo?.media, post.featuredVideo?.poster].some(
      (value) => same(value, id),
    )
  )
    return true
  if (kind === 'snippets' && same(post.featuredSnippet, id)) return true
  if (
    kind === 'sources' &&
    [
      ...(post.sources || []),
      post.featuredImage?.source,
      post.featuredVideo?.source,
      post.featuredSnippetSource,
    ].some((value) => same(value, id))
  )
    return true
  for (const slide of post.slides || [])
    for (const block of slide.content || []) {
      if (
        kind === 'media' &&
        (('media' in block && same(block.media, id)) ||
          ('poster' in block && same(block.poster, id)))
      )
        return true
      if (kind === 'snippets' && 'snippet' in block && same(block.snippet, id)) return true
      if (kind === 'sources' && 'source' in block && same(block.source, id)) return true
    }
  return false
}

export async function rejectPublishedReferences(
  req: PayloadRequest,
  kind: Kind,
  id: string | number,
) {
  await lockPublishedContent(req)
  let page = 1
  while (true) {
    // Read published snapshots through Payload: a newer draft may have removed a
    // reference that still exists in the article visible to anonymous readers.
    const result = await req.payload.find({
      collection: 'posts',
      req,
      overrideAccess: true,
      draft: false,
      depth: 0,
      limit: 100,
      page,
      where: { _status: { equals: 'published' } },
      select: {
        title: true,
        featuredImage: true,
        featuredVideo: true,
        featuredSnippet: true,
        featuredSnippetSource: true,
        sources: true,
        slides: { content: { image: true, video: true, download: true, link: true, embed: true } },
      },
    })
    const post = result.docs.find((post) => references(post as Partial<Post>, kind, id))
    if (post)
      throw new APIError(
        `This item is used by the published post “${post.title}”. Remove the reference or unpublish the post first.`,
        400,
      )
    if (!result.hasNextPage) break
    page++
  }
  if (kind === 'media') {
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
    await rejectPublishedReferences(req, kind, id)
  }
