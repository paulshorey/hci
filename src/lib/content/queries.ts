import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers, draftMode } from 'next/headers'

export const cms = () => getPayload({ config })
export const settings = cache(async () =>
  (await cms()).findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false }),
)

export async function previewUser() {
  if (!(await draftMode()).isEnabled) return null
  return (await (await cms()).auth({ headers: await headers() })).user
}

export async function posts(page = 1, topic?: number) {
  return (await cms()).find({
    collection: 'posts',
    overrideAccess: false,
    depth: 2,
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
}

export async function postBySlug(slug: string) {
  const user = await previewUser()
  const result = await (
    await cms()
  ).find({
    collection: 'posts',
    overrideAccess: false,
    user,
    draft: Boolean(user),
    depth: 3,
    limit: 1,
    where: {
      and: [{ slug: { equals: slug } }, ...(!user ? [{ _status: { equals: 'published' } }] : [])],
    },
  })
  return { post: result.docs[0] || null, preview: Boolean(user) }
}
