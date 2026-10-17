'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BundleForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <form
      className="bundle-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
          const response = await fetch('/api/bundle-import', {
            method: 'POST',
            body: new FormData(event.currentTarget),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Import failed.')
          router.push(`/admin/collections/snippets/${result.id}`)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Import failed.')
          setBusy(false)
        }
      }}
    >
      <label>
        Title
        <input name="title" required maxLength={200} />
      </label>
      <label>
        Entry file
        <input name="entryFile" defaultValue="index.html" required />
      </label>
      <label>
        ZIP bundle
        <input name="file" type="file" accept=".zip,application/zip" required />
      </label>
      <p>
        ZIP the contents or compress a single folder containing index.html. Finder metadata is
        ignored. Up to 25 MB compressed, 100 MB expanded, and 500 files. HTML, CSS, JavaScript,
        JSON, fonts, images, and web video are supported.
      </p>
      {error && <p role="alert">{error}</p>}
      <button className="button" type="submit" disabled={busy}>
        {busy ? 'Importing…' : 'Import draft bundle'}
      </button>
    </form>
  )
}
