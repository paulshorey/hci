import path from 'node:path'
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
import { Entries } from './collections/Entries'
import { ContentLists } from './collections/ContentLists'
import { Media } from '@multimedia/cms/collections/Media'
import { Sources } from '@multimedia/cms/collections/Sources'
import { Snippets } from '@multimedia/cms/collections/Snippets'
import { Topics } from '@multimedia/cms/collections/Topics'
import { Users } from '@multimedia/cms/collections/Users'
import { SiteSettings } from '@multimedia/cms/collections/SiteSettings'
import { assertDurableStorage, mediaUploadLimitMB, secret, siteURL } from '@multimedia/cms/lib/env'
import { mediaStoragePlugin } from '@multimedia/cms/lib/storage/payload'
import { admin, editor } from '@multimedia/cms/lib/content/access'
import { bundleImportEndpoint } from '@multimedia/cms/lib/snippets/endpoint'
import { email } from '@multimedia/cms/lib/email'

const maxFileSize = mediaUploadLimitMB() * 1024 * 1024
export function createMultimediaCMS(options: {
  directory: string
  databaseURL: string
  title?: string
  navigationComponents?: string[]
  bundleLibraryHelp?: string
}) {
  const dirname = options.directory
  return buildConfig({
    secret: secret(),
    serverURL: siteURL(),
    admin: {
      user: 'users',
      importMap: { baseDir: dirname },
      components: { afterNavLinks: options.navigationComponents || [] },
    },
    csrf: [siteURL()],
    cors: [siteURL()],
    collections: [
      Users,
      Entries,
      ContentLists,
      Media,
      Sources,
      Topics,
      {
        ...Snippets,
        admin: {
          ...Snippets.admin,
          components: options.bundleLibraryHelp
            ? { beforeList: [options.bundleLibraryHelp] }
            : undefined,
        },
      },
    ],
    globals: [
      {
        ...SiteSettings,
        fields: SiteSettings.fields.map((field) =>
          field.type === 'text' && field.name === 'title'
            ? { ...field, defaultValue: options.title || 'Multimedia CMS' }
            : field,
        ),
      },
    ],
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
    typescript: {
      outputFile: path.resolve('packages/multimedia-cms/src/generated/payload-types.ts'),
    },
    db: postgresAdapter({
      pool: { connectionString: options.databaseURL, max: 10, connectionTimeoutMillis: 10000 },
      push: false,
      migrationDir: path.join(dirname, 'migrations'),
      generateSchemaOutputFile: path.resolve(
        'packages/multimedia-cms/src/generated/payload-schema.ts',
      ),
    }),
    jobs: {
      access: {
        run: ({ req }) => req.user?.role === 'admin',
        queue: ({ req }) => Boolean(req.user),
      },
      autoRun: process.env.CMS_RUN_JOBS === 'true' ? [{ cron: '* * * * *', limit: 10 }] : [],
    },
    plugins: [mediaStoragePlugin()],
  })
}
