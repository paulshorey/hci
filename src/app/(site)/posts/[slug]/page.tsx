import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { postBySlug, settings } from '@/lib/content/queries'
import {
  ImageContent,
  VideoContent,
  SnippetContent,
  ContentBlock,
  mediaDocument,
} from '@/components/Content'
import { Slideshow } from '@/components/Slideshow'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { post, preview } = await postBySlug((await params).slug)
  if (!post) return {}
  const image = mediaDocument(post.featuredImage?.media)
  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.summary,
    alternates: { canonical: `/posts/${post.slug}` },
    robots: preview ? { index: false, follow: false } : undefined,
    openGraph: {
      title: post.title,
      description: post.summary,
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
            {post.slides?.length || 0} {post.slides?.length === 1 ? 'slide' : 'slides'}
          </span>
        </div>
      </header>
      <div className="article-body">
        {post.featuredImage?.media && <ImageContent value={post.featuredImage} />}
        {(post.featuredVideo?.media || post.featuredVideo?.url) && (
          <VideoContent value={post.featuredVideo} />
        )}
        {post.body && (
          <div className="prose article-prose">
            <RichText data={post.body} />
          </div>
        )}
        {post.featuredLink && (
          <a
            className="featured-link"
            href={post.featuredLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open featured reference ↗
          </a>
        )}
        {post.featuredSnippet && (
          <SnippetContent
            value={post.featuredSnippet}
            title={`${post.title}: interactive`}
            caption={post.featuredSnippetCaption}
            source={post.featuredSnippetSource}
            preview={preview}
          />
        )}
        <Slideshow
          slides={(post.slides || []).map((slide, index) => ({
            id: slide.id || String(index + 1),
            title: slide.title || `Observation ${index + 1}`,
            layout: slide.layout,
            content: slide.content.map((block) => (
              <ContentBlock key={block.id} block={block} preview={preview} />
            )),
          }))}
        />
        {!!post.sources?.length && (
          <section className="sources">
            <span className="eyebrow">Research trail</span>
            <h2>Sources & evidence</h2>
            <ol>
              {post.sources.map(
                (source) =>
                  typeof source === 'object' && (
                    <li key={source.id}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title} ↗
                      </a>
                      <p>
                        {source.publisher}
                        {source.accessedAt &&
                          ` · Accessed ${new Date(source.accessedAt).toLocaleDateString('en-US', { timeZone: site.timeZone })}`}
                      </p>
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
