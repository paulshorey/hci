import Link from 'next/link'
import { posts, settings } from '@/lib/content/queries'
import { PostCard } from '@/components/PostCard'

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(10000, Number((await searchParams).page) || 1))
  const [result, site] = await Promise.all([posts(page), settings()])
  return (
    <div className="page-shell">
      <section className="journal-intro">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> An independent field journal
          </span>
          <h1>
            Observe closely.
            <br />
            <em>Make sense of it.</em>
          </h1>
          <p>{site.description}</p>
        </div>
        <div className="intro-aside">
          <span className="crosshair" aria-hidden="true">
            ⌖
          </span>
          <p>
            Collected observations.
            <br />
            Connected evidence.
            <br />
            Room for a better question.
          </p>
          <span className="mono">EST. 2026 / OPEN ENDED</span>
        </div>
      </section>
      <div className="section-label">
        <h2>The journal</h2>
        <span>
          {result.totalDocs} {result.totalDocs === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      {result.docs.length ? (
        <div className="post-grid">
          {result.docs.map((post, index) => (
            <PostCard key={post.id} post={post} index={(page - 1) * 12 + index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>A place for your next observation.</h2>
          <p>
            Create a post in Payload, or run the local sample-content seed to explore the template.
          </p>
          <Link className="button" href="/admin">
            Open the editor ↗
          </Link>
        </div>
      )}
      {result.totalPages > 1 && (
        <nav className="pagination" aria-label="Journal pages">
          {result.hasPrevPage && <Link href={`/?page=${page - 1}`}>← Newer entries</Link>}
          <span>
            Page {page} of {result.totalPages}
          </span>
          {result.hasNextPage && <Link href={`/?page=${page + 1}`}>Older entries →</Link>}
        </nav>
      )}
    </div>
  )
}
