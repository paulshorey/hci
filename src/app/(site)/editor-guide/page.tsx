import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/lib/content/queries'
import { mediaUploadLimitMB } from '@multimedia/cms/lib/env'

export const metadata = { title: 'Editor guide', robots: { index: false, follow: false } }

export default async function EditorGuide() {
  const { user } = await (await cms()).auth({ headers: await headers() })
  if (!user) redirect('/admin/login')
  return (
    <div className="page-shell narrow prose">
      <Link href="/admin">← Payload CMS</Link>
      <h1>Add and organize your evidence.</h1>
      <p>
        Everything in an article can be entered here manually. Upload files once, then reuse them in
        entries, content lists and sources.
      </p>
      <ol>
        <li>
          <Link href="/admin/collections/media">Upload media</Link>. Use folders to organize
          research projects. Files start private. Photos, MP4/WebM video, MOV originals, audio,
          PDFs, Office documents, plain text, Markdown, CSV, JSON and downloadable ZIPs are
          supported, up to {mediaUploadLimitMB()} MiB per file. Convert MOV originals to MP4/WebM to
          play them inline.
        </li>
        <li>
          <Link href="/admin/collections/sources">Create sources</Link>. Add the original URL or
          attach your own evidence files. Add attribution and dates; private research notes stay out
          of the public site.
        </li>
        <li>
          <Link href="/admin/collections/entries">Write an article</Link>. The primary content
          section is always present and may be empty. Edit it to add text, images, video, audio,
          links, files or interactive bundles. Add optional content lists for carousels,
          comparisons, resources or any other material. Every list supports the same content types.
        </li>
        <li>
          Add captions, image descriptions and optional transcripts. Use the comparison layout for
          related screenshots or recordings.
        </li>
        <li>
          Make intended media public, publish its sources and bundles, and use Preview on the
          article before publishing it.
        </li>
      </ol>
      <h2>ZIP archives and interactive folders</h2>
      <p>
        For an archive that readers should download, upload the ZIP to Media and add a Download
        block. To run an HTML/CSS/JS folder in a slide,{' '}
        <Link href="/bundles/import">import an interactive ZIP</Link>. Include index.html and its
        relative files at the ZIP root. Preview and publish the imported bundle, then select it in
        an Embed block.
      </p>
      <h2>Drafts, publishing and scheduled releases</h2>
      <p>
        Editing content creates a new revision automatically. Save a draft, preview it, and publish
        when ready; older entry versions retain their exact list revisions. Use the publishing
        controls to schedule a future publish or unpublish. Editorial-team-only entries remain
        private even when published. Published references protect their files from replacement or
        removal. Upload a revised file or bundle as a new record, then choose it in the article or
        source. A newer draft does not change the evidence in the live version. Folder changes only
        organize the library; they do not move stored files or break links.
      </p>
      <p>
        Browser video/audio support depends on codecs. For long videos or files above the upload
        limit, use a supported external video URL or arrange a managed-video upload workflow.
      </p>
    </div>
  )
}
