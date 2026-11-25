# Multimedia CMS

A reusable TypeScript/Payload CMS for multimedia websites. The root Next.js application is the first client, HCI. Each website deploys its own installation, PostgreSQL database, private Railway Bucket, users and secrets.

An **entry is a container** for identity, metadata, permissions and publishing. Its ordered `contentLists` relationships point to separate content-list records. The first relation is required and created automatically. Every list may be completely empty; otherwise it contains ordered items with any combination of rich text, images, video, audio, links, files and isolated interactive bundles. Repeated media types are supported.

## Organization

- `packages/multimedia-cms`: Payload collections, field definitions, permissions, immutable list revisions, asset handling and publishing safeguards.
- `packages/multimedia-renderers`: optional React block, list and carousel renderers.
- `src`: HCI's Next.js application, CMS host configuration, branding and routes. The CMS package has no dependency on HCI routes or components; host-only navigation components are supplied through configuration.
- `services/embeds`: separate origin for validated HTML/CSS/JS bundles.
- `src/migrations`, `schema/current.sql`: this installation's generated migration baseline and checked SQL snapshot.

## Local development

Use Node 24, pnpm 10.28.1 and PostgreSQL 17, including matching `pg_dump`/`psql` clients.

```sh
pnpm install --frozen-lockfile
pnpm setup:local
docker compose up -d
pnpm db:migrate
pnpm seed
```

Run `pnpm dev` and `pnpm embeds:dev` in separate terminals. Open the site and CMS at `http://localhost:4500` and `/admin`; embeds use port 4501. Create the first administrator through Payload's first-user screen. The local seed creates three clearly illustrative entries and sample files, with no accounts or default passwords.

The app and all database commands require project-specific `DB_HCI_URL`. A generic global `DATABASE_URL` is ignored. Keep actual connection strings and generated authentication secrets in ignored `.env` or the intended process environment. `setup:local` preserves an existing file. `HCI_TEST_DATABASE_URL` must point to a separate local disposable database ending in `_test`, with a role able to create databases.

The old experimental blog schema is intentionally incompatible. Existing installations must follow [the one-time reset procedure](docs/cms-reset.md) before migrating this baseline. Ordinary releases never reset databases.

## Manual editing

1. Create an **Entry** and give it a title and slug. Its **Primary content** section is always present. It has no remove-list control and can stay empty.
2. Use **Add content** or **Edit content** to open the content editor within the entry. Add optional items and any combination of content blocks, then save. This creates a new list revision automatically.
3. Use **Add another content list** for optional carousels, lists, grids or continuous content. Additional lists can be removed or reordered without changing the primary relation. All lists have identical content capabilities.
4. Upload reusable files in **Media**. Organize them with folders; folder changes do not move storage objects. Images, browser-ready video, audio, documents, datasets and downloadable ZIPs are supported. Keep files private until public delivery is intended.
5. Add captions, image descriptions and optional source relationships to placements. Publish referenced sources and interactive bundles and make files public before publishing a public entry. No block or media type is mandatory.
6. Save drafts and use Preview. Drafts, scheduled releases and restored entry versions point to their exact content-list revisions. **Public website** and **Editorial team only** control entry delivery independently from draft/published status.
7. Use Payload's publishing controls to schedule publishing or unpublishing. Railway's persistent web service runs the native job queue every minute with `CMS_RUN_JOBS=true`; administrators can inspect failures in Payload's read-only Jobs collection and publishing still enforces access and asset validation.

Creating additional accounts, deleting library records and changing site settings require an administrator. Editors can write and publish content. CMS account identities and source research notes stay out of anonymous responses.

## Interactive folders and files

Ordinary ZIP archives remain downloadable Media files. To run HTML/CSS/JS, use the authenticated **Import an interactive ZIP** page or:

```sh
pnpm snippets:import /absolute/path/to/folder 'Experiment title' index.html
```

Imported files keep their relative paths in an immutable bundle manifest. Import updates as new bundle versions. Bundles run in a browser sandbox on a separate origin, without CMS HTTP routes or authentication cookies. External network dependencies remain blocked. See [storage and sandbox rules](docs/storage.md).

## Database workflow

Payload collections and blocks are the only application schema definition. Schema push is disabled. Generate additive forward migrations and commit the generated contracts and SQL snapshot:

```sh
pnpm db:migration:create descriptive_name
pnpm db:migrate
pnpm generate:types
pnpm db:snapshot
pnpm db:verify
```

Always use `pnpm db:migrate`, which holds a migration lock and checks applied-file checksums. Applied migrations are immutable. Do not run migration-down, native reset or schema-push commands against deployed data. The narrowly recorded experimental reset exception cannot remove or rewrite the new baseline.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm check-types
pnpm test
pnpm db:verify
pnpm test:integration
pnpm build
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Database tests create and remove their own local databases. Browser tests use the production build and their own database, generated accounts and storage directory on ports 4500/4501; stop other local servers on these ports first. S3 tests exercise real signed AWS SDK wire requests against a local fixture, not the live provider.

See [architecture](docs/architecture.md), [deployment targets](docs/deployment.md), [Railway operations](.railway/README.md), and [storage setup](docs/storage-options.md). Deployed storage uses a private Railway Bucket through S3-compatible adapters. Railway application services use `DB_HCI_URL=${{postgres.DATABASE_PUBLIC_URL}}`; private database networking remains a future explicit choice. Configure SMTP before relying on password recovery; reset tokens and failed emails are never printed to logs.
