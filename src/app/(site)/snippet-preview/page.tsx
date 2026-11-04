import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { cms } from '@/lib/content/queries'
import { SnippetContent } from '@multimedia/renderers'
export const metadata = { title: 'Interactive preview', robots: { index: false, follow: false } }
export default async function SnippetPreview({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const payload = await cms()
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/admin/login')
  const id = Number((await searchParams).id)
  if (!Number.isSafeInteger(id) || id < 1) notFound()
  const snippet = await payload.findByID({
    collection: 'snippets',
    id,
    user,
    overrideAccess: false,
    draft: true,
    disableErrors: true,
  })
  if (!snippet) notFound()
  return (
    <div className="page-shell">
      <header className="simple-header">
        <span className="eyebrow">Authenticated preview · expires in 15 minutes</span>
        <h1>{snippet.title}</h1>
      </header>
      <SnippetContent value={snippet} title={snippet.title} preview height={600} />
    </div>
  )
}
