import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { settings } from '@/lib/content/queries'
import { siteURL } from '@/lib/env'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/libre-caslon-display/400.css'
import './styles.css'

export const dynamic = 'force-dynamic'
export async function generateMetadata(): Promise<Metadata> {
  const site = await settings()
  return {
    metadataBase: new URL(siteURL()),
    title: { default: site.title, template: `%s — ${site.title}` },
    description: site.description,
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  }
}
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await settings()
  const logo = site.logo && typeof site.logo === 'object' ? site.logo : null
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/" className="wordmark">
            {logo?.url ? (
              <Image src={logo.url} alt="" width={38} height={38} unoptimized />
            ) : (
              <span className="brand-mark" aria-hidden="true">
                h/c
              </span>
            )}
            {site.title}
          </Link>
          <nav aria-label="Main navigation">
            {site.navigation?.length ? (
              site.navigation.map((item) => (
                <Link key={item.id} href={item.href}>
                  {item.label}
                </Link>
              ))
            ) : (
              <>
                <Link href="/">Journal</Link>
                <Link href="/topics">Topics</Link>
              </>
            )}
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div>
            <strong>{site.title}</strong>
            <p>{site.description}</p>
          </div>
          <div>
            <Link href="/feed.xml">RSS</Link>
            <Link href="/admin">Editor login ↗</Link>
          </div>
        </footer>
      </body>
    </html>
  )
}
