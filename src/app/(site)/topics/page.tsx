import Link from 'next/link'
import { cms } from '@/lib/content/queries'

export const metadata = { title: 'Topics' }
export default async function TopicsPage() {
  const topics = await (
    await cms()
  ).find({ collection: 'topics', limit: 100, sort: 'title', overrideAccess: false })
  return (
    <div className="page-shell">
      <header className="simple-header">
        <span className="eyebrow">Follow a thread</span>
        <h1>Topics</h1>
        <p>Different lenses for looking at the same world.</p>
      </header>
      <div className="topics-grid">
        {topics.docs.map((topic) => (
          <Link href={`/topics/${topic.slug}`} key={topic.id}>
            <h2>{topic.title} ↗</h2>
            <p>{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
