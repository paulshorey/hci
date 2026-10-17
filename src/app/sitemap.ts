import type { MetadataRoute } from 'next'
import { cms } from '@/lib/content/queries'
import { siteURL } from '@/lib/env'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await cms()
  const entries: MetadataRoute.Sitemap = [{ url: siteURL() }, { url: `${siteURL()}/topics` }]
  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      depth: 0,
      limit: 100,
      page,
      where: { _status: { equals: 'published' } },
    })
    entries.push(
      ...result.docs.map((post) => ({
        url: `${siteURL()}/posts/${post.slug}`,
        lastModified: post.updatedAt,
      })),
    )
    if (!result.hasNextPage) break
    page++
  }
  return entries
}
