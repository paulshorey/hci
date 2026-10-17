import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cms, posts } from '@/lib/content/queries'
import { PostCard } from '@/components/PostCard'

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const topic = (
    await (
      await cms()
    ).find({
      collection: 'topics',
      overrideAccess: false,
      where: { slug: { equals: slug } },
      limit: 1,
    })
  ).docs[0]
  if (!topic) notFound()
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1))
  const result = await posts(page, topic.id)
  return (
    <div className="page-shell">
      <header className="simple-header">
        <Link className="back-link" href="/topics">
          ← All topics
        </Link>
        <h1>{topic.title}</h1>
        <p>{topic.description}</p>
      </header>
      <div className="post-grid">
        {result.docs.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </div>
      {!result.docs.length && <p>No published entries yet.</p>}
      {result.totalPages > 1 && (
        <nav className="pagination" aria-label="Topic pages">
          {result.hasPrevPage && <Link href={`?page=${page - 1}`}>← Previous</Link>}
          <span>
            {page} / {result.totalPages}
          </span>
          {result.hasNextPage && <Link href={`?page=${page + 1}`}>Next →</Link>}
        </nav>
      )}
    </div>
  )
}
