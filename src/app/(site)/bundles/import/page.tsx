import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cms } from '@/lib/content/queries'
import { BundleForm } from '@/components/BundleForm'
export const metadata = {
  title: 'Import an interactive bundle',
  robots: { index: false, follow: false },
}
export default async function ImportPage() {
  const { user } = await (await cms()).auth({ headers: await headers() })
  if (!user) redirect('/admin/login')
  return (
    <div className="page-shell narrow">
      <header className="simple-header">
        <Link className="back-link" href="/admin/collections/snippets">
          ← Interactive bundles
        </Link>
        <h1>Bring an idea to life.</h1>
        <p>
          Import a self-contained HTML, CSS, and JavaScript folder. It will be saved as a draft
          bundle that you can preview and publish in Payload.
        </p>
      </header>
      <BundleForm />
    </div>
  )
}
