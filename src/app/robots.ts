import type { MetadataRoute } from 'next'
import { siteURL } from '@/lib/env'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/preview', '/bundles/import', '/snippet-preview'],
    },
    sitemap: `${siteURL()}/sitemap.xml`,
  }
}
