import type { Payload } from 'payload'
import type { Entry, ImageBlock, Media, Topic, User } from '../../types'
import { relationID } from './values'

export type EntrySummary = Pick<Entry, 'id' | 'title' | 'slug' | 'summary' | 'publishedAt'> & {
  topics: Topic[]
  cover: ImageBlock | null
  itemCount: number
}
const ids = (values: unknown[]) => [
  ...new Set(values.map(relationID).filter((id): id is number => typeof id === 'number')),
]
export async function entrySummaries(payload: Payload, page = 1, topic?: number) {
  const result = await payload.find({
    collection: 'entries',
    overrideAccess: false,
    depth: 0,
    page,
    limit: 12,
    sort: '-publishedAt',
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...(topic ? [{ topics: { contains: topic } }] : []),
      ],
    },
  })
  const all = ids(result.docs.flatMap((entry) => entry.contentLists))
  const primary = ids(result.docs.map((entry) => entry.contentLists[0]))
  const topicIDs = ids(result.docs.flatMap((entry) => entry.topics || []))
  const [metadata, covers, topics] = await Promise.all([
    all.length
      ? payload.find({
          collection: 'content-lists',
          overrideAccess: false,
          depth: 0,
          pagination: false,
          where: { id: { in: all } },
          select: { presentation: true, items: { key: true } },
        })
      : { docs: [] },
    primary.length
      ? payload.find({
          collection: 'content-lists',
          overrideAccess: false,
          depth: 0,
          pagination: false,
          where: { id: { in: primary } },
          select: { items: { content: { image: true } } },
        })
      : { docs: [] },
    topicIDs.length
      ? payload.find({
          collection: 'topics',
          overrideAccess: false,
          depth: 0,
          pagination: false,
          where: { id: { in: topicIDs } },
        })
      : { docs: [] },
  ])
  const coverByList = new Map(
    covers.docs.map((list) => [
      list.id,
      list.items
        ?.flatMap((item) => item.content || [])
        .find((block) => block.blockType === 'image'),
    ]),
  )
  const mediaIDs = ids([...coverByList.values()].map((block) => block?.media))
  const media = mediaIDs.length
    ? await payload.find({
        collection: 'media',
        overrideAccess: false,
        depth: 0,
        pagination: false,
        where: { id: { in: mediaIDs } },
      })
    : { docs: [] as Media[] }
  const files = new Map(media.docs.map((file) => [file.id, file]))
  const listMetadata = new Map(metadata.docs.map((list) => [list.id, list]))
  const topicMap = new Map(topics.docs.map((topic) => [topic.id, topic]))
  const docs: EntrySummary[] = result.docs.map((entry) => {
    const image = coverByList.get(Number(relationID(entry.contentLists[0])))
    const cover = image && files.get(Number(relationID(image.media)))
    return {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      summary: entry.summary,
      publishedAt: entry.publishedAt,
      cover: image && cover ? { ...image, media: cover } : null,
      topics: (entry.topics || [])
        .map((value) => topicMap.get(Number(relationID(value))))
        .filter((value): value is Topic => Boolean(value)),
      itemCount: entry.contentLists.reduce<number>((count, value) => {
        const list = listMetadata.get(Number(relationID(value)))
        return count + (list?.presentation === 'carousel' ? list.items?.length || 0 : 0)
      }, 0),
    }
  })
  return { ...result, docs }
}
export async function entryBySlug(
  payload: Payload,
  slug: string,
  options: { preview?: boolean; user?: User | null } = {},
) {
  if (options.preview && !options.user)
    throw new Error('Draft preview requires an authenticated user.')
  const result = await payload.find({
    collection: 'entries',
    overrideAccess: false,
    user: options.preview ? options.user : null,
    draft: Boolean(options.preview),
    depth: 3,
    limit: 1,
    where: {
      and: [
        { slug: { equals: slug } },
        ...(!options.preview ? [{ _status: { equals: 'published' } }] : []),
      ],
    },
  })
  return result.docs[0] || null
}
