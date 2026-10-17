import Link from 'next/link'
import type { Post } from '@/generated/payload-types'
import { ImageContent } from './Content'
import { settings } from '@/lib/content/queries'

export async function PostCard({ post, index }: { post: Post; index: number }) {
  const site = await settings()
  return (
    <article className="post-card">
      <Link href={`/posts/${post.slug}`} className="card-cover" aria-label={post.title}>
        {post.featuredImage?.media ? (
          <ImageContent value={post.featuredImage} card />
        ) : (
          <div className={`abstract-cover cover-${index % 3}`}>
            <span>
              Field note
              <br />
              {String(index + 1).padStart(2, '0')}
            </span>
            <i aria-hidden="true" />
          </div>
        )}
      </Link>
      <div className="card-meta">
        <time dateTime={post.publishedAt || undefined}>
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: site.timeZone,
              })
            : 'Field note'}
        </time>
        <span>
          {post.slides?.length || 0} {post.slides?.length === 1 ? 'slide' : 'slides'}
        </span>
      </div>
      <h2>
        <Link href={`/posts/${post.slug}`}>{post.title}</Link>
      </h2>
      <p>{post.summary}</p>
      <div className="topic-list">
        {post.topics?.map(
          (topic) =>
            typeof topic === 'object' && (
              <Link href={`/topics/${topic.slug}`} key={topic.id}>
                {topic.title}
              </Link>
            ),
        )}
      </div>
    </article>
  )
}
