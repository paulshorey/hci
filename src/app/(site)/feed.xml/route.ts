import { cms, settings } from '@/lib/content/queries'
import { siteURL } from '@multimedia/cms/lib/env'
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!,
  )

export async function GET() {
  const [site, result] = await Promise.all([
    settings(),
    (await cms()).find({
      collection: 'entries',
      overrideAccess: false,
      depth: 0,
      limit: 50,
      sort: '-publishedAt',
      where: { _status: { equals: 'published' } },
    }),
  ])
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(site.title)}</title><link>${xml(siteURL())}</link><description>${xml(site.description || '')}</description>${result.docs.map((post) => `<item><title>${xml(post.title)}</title><link>${siteURL()}/posts/${post.slug}</link><guid>${siteURL()}/posts/${post.slug}</guid><description>${xml(post.summary || '')}</description>${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}</item>`).join('')}</channel></rss>`
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
