import { cache } from 'react'
import { entrySummaries, entryBySlug } from '@multimedia/cms/lib/content/queries'
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
  return entrySummaries(await cms(), page, topic)
}

export async function postBySlug(slug: string) {
  const user = await previewUser()
  return {
    post: await entryBySlug(await cms(), slug, { preview: Boolean(user), user }),
    preview: Boolean(user),
  }
}
