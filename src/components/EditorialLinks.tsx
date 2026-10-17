import Link from 'next/link'

export function EditorialLinks() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', margin: '1.5rem 0' }}>
      <Link href="/bundles/import">Import an interactive ZIP</Link>
      <Link href="/editor-guide">Editor guide</Link>
    </div>
  )
}

export function BundleLibraryHelp() {
  return (
    <div style={{ marginBottom: '1.5rem', maxWidth: '65ch' }}>
      <p>
        <Link href="/bundles/import">Import an interactive ZIP</Link> to create a bundle. Each
        import keeps its own files; import revisions separately and choose the version in your
        article.
      </p>
    </div>
  )
}
