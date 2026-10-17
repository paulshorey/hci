import { APIError, type GlobalConfig } from 'payload'
import { admin } from '@/lib/content/access'
import { relationID } from '@/lib/content/publication'
import { lockPublishedContent } from '@/lib/content/transactions'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: { read: () => true, update: admin },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const id = relationID(data.logo === undefined ? originalDoc?.logo : data.logo)
        if (id) {
          await lockPublishedContent(req)
          const media = await req.payload.findByID({
            collection: 'media',
            id,
            req,
            overrideAccess: true,
            depth: 0,
          })
          if (media.visibility !== 'public' || !media.mimeType?.startsWith('image/'))
            throw new APIError('Choose a public image for the site logo.', 400)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, defaultValue: 'Human / Computer' },
    {
      name: 'description',
      type: 'textarea',
      defaultValue: 'A field journal of interfaces, interactions, and the evidence behind them.',
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'timeZone',
      type: 'text',
      required: true,
      defaultValue: 'America/Chicago',
      validate: (value: unknown) => {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: String(value) })
          return true
        } catch {
          return 'Use an IANA time zone, such as America/Chicago or Europe/London.'
        }
      },
    },
    {
      name: 'navigation',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'href',
          type: 'text',
          required: true,
          validate: (value: unknown) =>
            typeof value === 'string' && /^\/(?!\/)[a-zA-Z0-9/#?=&%-]*$/.test(value)
              ? true
              : 'Use a site-relative path beginning with one /.',
        },
      ],
    },
  ],
}
