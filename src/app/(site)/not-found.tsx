import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="page-shell empty-state">
      <span className="eyebrow">404</span>
      <h1>This page is still unwritten.</h1>
      <Link className="button" href="/">
        Return to the journal
      </Link>
    </div>
  )
}
