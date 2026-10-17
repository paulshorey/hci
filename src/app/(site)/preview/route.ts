import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/lib/content/queries'

export async function GET(request: Request) {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return new Response('Sign in to Payload before opening a preview.', { status: 401 })
  const slug = new URL(request.url).searchParams.get('slug') || ''
  const result = await payload.find({
    collection: 'posts',
    draft: true,
    user,
    overrideAccess: false,
    limit: 1,
    where: { slug: { equals: slug } },
  })
  if (!result.docs[0]) return new Response('Post not found.', { status: 404 })
  ;(await draftMode()).enable()
  redirect(`/posts/${encodeURIComponent(result.docs[0].slug)}`)
}
