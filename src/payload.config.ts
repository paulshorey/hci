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
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Posts } from '@/collections/Posts'
import { Media } from '@/collections/Media'
import { Sources } from '@/collections/Sources'
import { Snippets } from '@/collections/Snippets'
import { Topics } from '@/collections/Topics'
import { Users } from '@/collections/Users'
import { SiteSettings } from '@/collections/SiteSettings'
import { assertDurableStorage, mediaUploadLimitMB, required, secret, siteURL } from '@/lib/env'
import { mediaStoragePlugin } from '@/lib/storage/payload'
import { admin, editor } from '@/lib/content/access'
import { bundleImportEndpoint } from '@/lib/snippets/endpoint'
import { email } from '@/lib/email'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const maxFileSize = mediaUploadLimitMB() * 1024 * 1024
export default buildConfig({
  secret: secret(),
  serverURL: siteURL(),
  admin: {
    user: 'users',
    importMap: { baseDir: dirname },
    components: { afterNavLinks: ['/components/EditorialLinks#EditorialLinks'] },
  },
  csrf: [siteURL()],
  cors: [siteURL()],
  collections: [Users, Posts, Media, Sources, Topics, Snippets],
  globals: [SiteSettings],
  folders: {
    collectionOverrides: [
      ({ collection }) => ({
        ...collection,
        access: { read: editor, create: editor, update: editor, delete: admin },
      }),
    ],
  },
  onInit: async () => assertDurableStorage(),
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
  upload: {
    abortOnLimit: true,
    requestSizeLimit: maxFileSize + 1024 * 1024,
    limits: { fileSize: maxFileSize, files: 1 },
  },
  graphQL: { disable: true },
  typescript: { outputFile: path.join(dirname, 'generated/payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: required('DATABASE_URL'), max: 10, connectionTimeoutMillis: 10000 },
    push: false,
    migrationDir: path.join(dirname, 'migrations'),
    generateSchemaOutputFile: path.join(dirname, 'generated/payload-schema.ts'),
  }),
  plugins: [mediaStoragePlugin()],
})
