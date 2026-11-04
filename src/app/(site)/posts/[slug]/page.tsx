import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { postBySlug, settings } from '@/lib/content/queries'
import { mediaDocument, SourceAttachments } from '@multimedia/renderers'
import { ContentLists } from '@multimedia/renderers/lists'
import { firstImage, entryLists, itemCount } from '@multimedia/cms/lib/content/delivery'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { post, preview } = await postBySlug((await params).slug)
  if (!post) return {}
  const image = mediaDocument(firstImage(post)?.media)
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.summary,
    alternates: { canonical: `/posts/${post.slug}` },
    robots: preview ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: 'article',
      publishedTime: post.publishedAt || undefined,
      images: image?.url ? [image.url] : [],
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { post, preview } = await postBySlug((await params).slug)
  const site = await settings()
  if (!post) notFound()
  return (
    <article className="post-page">
      {preview && (
        <aside className="preview-banner">
          Authenticated draft preview <a href="/preview/exit">Exit preview</a>
        </aside>
      )}
      <header className="article-header">
        <Link className="back-link" href="/">
          ← The journal
        </Link>
        <div className="topic-list">
          {post.topics?.map(
            (topic) =>
              typeof topic === 'object' && (
                <Link key={topic.id} href={`/topics/${topic.slug}`}>
                  {topic.title}
                </Link>
              ),
          )}
        </div>
        <h1>{post.title}</h1>
        <p className="article-summary">{post.summary}</p>
        <div className="article-meta">
          {post.byline && <span>By {post.byline}</span>}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                dateStyle: 'long',
                timeZone: site.timeZone,
              })}
            </time>
          )}
          <span>
            {itemCount(entryLists(post).filter((list) => list.presentation === 'carousel'))}{' '}
            {itemCount(entryLists(post).filter((list) => list.presentation === 'carousel')) === 1
              ? 'slide'
              : 'slides'}
          </span>
        </div>
      </header>
      <div className="article-body">
        <ContentLists lists={entryLists(post)} preview={preview} />
        {!!post.sources?.length && (
          <section className="sources">
            <span className="eyebrow">Research trail</span>
            <h2>Sources & evidence</h2>
            <ol>
              {post.sources.map(
                (source) =>
                  typeof source === 'object' && (
                    <li key={source.id}>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          {source.title} ↗
                        </a>
                      ) : (
                        <span>{source.title}</span>
                      )}
                      <p>
                        {source.publisher}
                        {source.accessedAt &&
                          ` · Accessed ${new Date(source.accessedAt).toLocaleDateString('en-US', { timeZone: site.timeZone })}`}
                      </p>
                      <SourceAttachments source={source} />
                      {source.archiveURL && (
                        <a
                          className="citation"
                          href={source.archiveURL}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Archived copy ↗
                        </a>
                      )}
                    </li>
                  ),
              )}
            </ol>
          </section>
        )}
      </div>
    </article>
  )
}
