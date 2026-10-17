import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import {
  lexicalEditor,
  BoldFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  HeadingFeature,
  OrderedListFeature,
  UnorderedListFeature,
  BlockquoteFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Posts } from '@/collections/Posts'
import { Media } from '@/collections/Media'
import { Sources } from '@/collections/Sources'
import { Snippets } from '@/collections/Snippets'
import { Topics } from '@/collections/Topics'
import { Users } from '@/collections/Users'
import { SiteSettings } from '@/collections/SiteSettings'
import { required, secret, siteURL } from '@/lib/env'
import { s3Config } from '@/lib/storage'
import { bundleImportEndpoint } from '@/lib/snippets/endpoint'
import { email } from '@/lib/email'

const dirname = path.dirname(fileURLToPath(import.meta.url))
export default buildConfig({
  secret: secret(),
  serverURL: siteURL(),
  admin: { user: 'users', importMap: { baseDir: dirname } },
  csrf: [siteURL()],
  cors: [siteURL()],
  collections: [Users, Posts, Media, Sources, Topics, Snippets],
  globals: [SiteSettings],
  endpoints: [bundleImportEndpoint],
  editor: lexicalEditor({
    features: [
      ParagraphFeature(),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
      BoldFeature(),
      ItalicFeature(),
      LinkFeature(),
      OrderedListFeature(),
      UnorderedListFeature(),
      BlockquoteFeature(),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
    ],
  }),
  sharp,
  email,
  upload: { limits: { fileSize: 100 * 1024 * 1024 } },
  graphQL: { disable: true },
  typescript: { outputFile: path.join(dirname, 'generated/payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: required('DATABASE_URL'), max: 10, connectionTimeoutMillis: 10000 },
    push: false,
    migrationDir: path.join(dirname, 'migrations'),
    generateSchemaOutputFile: path.join(dirname, 'generated/payload-schema.ts'),
  }),
  plugins:
    process.env.STORAGE_DRIVER === 's3'
      ? [
          s3Storage({
            bucket: required('S3_BUCKET'),
            config: s3Config(),
            collections: { media: { prefix: 'media' } },
          }),
        ]
      : [],
})
