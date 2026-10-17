# HCI blog

A reusable TypeScript blog for curated research and multimedia slideshows, built with Next.js, Payload, and PostgreSQL.

Posts own ordered slides; each slide owns ordered, typed content blocks. Images, videos, links, rich text, downloads, and executable HTML/CSS/JS bundles can coexist in one slide. Reordering a slide preserves all of its content, captions, and sources.

## Local development

Requirements: Node 24, pnpm 10.28.1, and PostgreSQL 17 (Docker Compose is provided).

```sh
pnpm install --frozen-lockfile
pnpm setup:local
docker compose up -d
pnpm db:migrate
pnpm seed
```

Run these in separate terminals:

```sh
pnpm dev
pnpm embeds:dev
```

Open [the blog](http://localhost:4500) and [Payload](http://localhost:4500/admin). Create your own first admin account in Payload. The seed creates no accounts or default passwords. The embed server listens on port 4501 and must use a different origin from the application.

`setup:local` creates an ignored `.env` with random authentication and preview secrets. It preserves an existing file. For a native PostgreSQL installation, create local `hci` and `hci_test` databases and adjust the ignored connection URLs. Application tables are created entirely by migrations.

The seed includes three clearly labeled illustrative articles, generated interface diagrams, a small video, a download, and an interactive experiment. These demonstrate the content model and make no claims about measured usability. Existing sample posts are preserved on subsequent runs.

## Editing content

1. Upload images, videos, or documents in **Media**. Files start private; mark files public when they are ready for public delivery.
2. Add evidence in **Sources**, including the original URL, publisher, access date, and optional archive URL. Editorial notes remain private.
3. Create a **Post**. Set its title, unique slug, summary, optional article text, and optional featured image/video/link/bundle.
4. Add slides in the **Slides** tab. Each slide can contain any number of text, image, video, link, download, or embed blocks. Choose a stacked or comparison layout.
5. Add captions and image alt text. Publish referenced sources/bundles and make referenced files public before publishing the post.
6. Use **Preview** to inspect an authenticated draft, then publish. A newer unpublished revision does not replace the public version.

Published relationships remain protected after publication. Remove a managed reference from the published article, or unpublish that article, before making its media private, unpublishing its source/bundle, or deleting the referenced record. Removing a reference only in a newer draft does not change the live article. Site logos similarly require public images and protect the chosen file until the logo is replaced.

Site branding, descriptions, logo, internal navigation, and display time zone are managed in **Site Settings**. The initial display time zone is America/Chicago; stored timestamps remain absolute instants. Users have admin/editor roles. Only admins manage accounts, delete content, or change site settings. Public reads always enforce Payload access control; the public byline is separate from the private CMS account relationship.

## Interactive bundles

Import a ZIP at [Import a bundle](http://localhost:4500/bundles/import), or import a folder:

```sh
pnpm snippets:import /absolute/path/to/folder 'Experiment title' index.html
```

Files keep their relative paths. The bundle's entry file can load local CSS, classic or module scripts, JSON, fonts, nested images, and web video. The included example lives in `samples/snippets/target-lab`.

Imported bundles start as drafts. Use the Preview button on the Snippet document, then publish it before referencing it in a published article. Published bundle files are immutable; import an updated folder as a new Snippet document/version. Old published posts retain their original evidence.

The isolated embed server serves only manifest-listed files. It has no CMS HTTP routes and uses sandbox/CSP restrictions. Draft preview URLs are short-lived capabilities bound to one bundle. Relative resources share the capability path so previews work without exposing CMS cookies.

See [architecture](docs/architecture.md) for the extension points and [storage](docs/storage.md) for limits and the sandbox contract.

## Database workflow

Payload configuration is the schema definition. Automatic schema push is disabled in every environment. Use the wrapper `db:migrate` to obtain the migration lock and enforce applied-file checksums.

```sh
# After changing collections or blocks:
pnpm db:migration:create descriptive_name
pnpm db:migrate
pnpm generate:types
pnpm db:snapshot
pnpm db:verify
```

Commit migrations, generated types/schema, and the SQL snapshot with the application change. Applied migration files are immutable. Use additive forward migrations and backfills for existing data. Never use `payload migrate:reset`, schema push, or migration-down commands on deployed databases.

`db:verify` requires matching PostgreSQL 17 client tools and a local `HCI_TEST_DATABASE_URL` ending in `_test`. It creates and removes a separate database; it does not reset your blog database. The local test account needs `CREATEDB` privileges. Fresh Docker volumes create `hci_test` through the local initialization script.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm check-types
pnpm test
pnpm db:verify
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests run the production build on ports 4500/4501 against their own temporary database and asset directory. Stop local servers on those ports first. Test accounts use generated credentials and are removed with the test database. Integration tests also use a separate temporary database. S3 adapter tests exercise real AWS SDK wire requests against a local test server; they do not establish live provider access.

To inspect a production build locally with disk storage, use `ALLOW_PERSISTENT_DISK=true pnpm start` and `ALLOW_PERSISTENT_DISK=true pnpm embeds:start`. Railway deployments use S3 storage.

## Deployment

The TypeScript Railway graph is in `.railway/railway.ts`: Postgres 17, an asset bucket, a web/CMS service, and an isolated embed service. `main` supplies development and `prod` supplies production. The web service runs migrations before starting the new release.

No cloud resources are provisioned by cloning or installing this project. Select the exact Railway project, environment, bucket region, and domains before applying the graph. The region is deliberately required because a bucket's region cannot change after creation. See [the deployment runbook](.railway/README.md) for bootstrap variables, environment secrets, plan/apply, and release verification.

SMTP is optional locally. Configure it before relying on CMS password recovery in a deployment. With no transport, delivery fails explicitly; emails and reset tokens are not printed to logs.
