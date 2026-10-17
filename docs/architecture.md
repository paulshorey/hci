# Architecture and extension points

## Content ownership

`src/payload.config.ts` and the collection/block definitions are the owning schema. Generated TypeScript types and the generated Drizzle schema are derived contracts. PostgreSQL is Payload's persistence layer; the application does not maintain a second ORM schema.

The model is `Post -> ordered slides -> ordered typed blocks`. Payload's array/block row IDs provide identity; ordering provides position. A slide never borrows content from a sibling position. Multiple blocks of the same type allow side-by-side screenshots or videos. Rich text and links may span a comparison row.

Slides are owned by a post so editing, draft history, and publishing are atomic at the article level. Media, source documents, and snippet versions are reusable references. Featured content is independent of slide content. A conventional article may have no slides.

Add a block by registering its Payload definition in `src/blocks/index.ts`, extending `ContentBlock` in `src/components/Content.tsx`, and adding publishing validation where needed. Then generate a forward migration and refresh contracts. The generated block union keeps the renderer typed. Keep data collection and rendering separate; a future gallery, timeline, or comparison viewer can read the same slide records.

## Published content and previews

Anonymous collection access constrains draft-enabled documents to published versions. Local API calls used by public pages explicitly set `overrideAccess: false`; Local API's privileged default must never be used for public delivery. Draft mode alone does not authenticate a reader. The preview route verifies a CMS user, and every draft page read reauthenticates the session. Preview pages are dynamic and marked noindex.

Media has an explicit private/public visibility setting, independent of whether a draft references the file. Files start private. Public posts are validated for accessible references, captions, image alt text, and supported video sources before publication. A public media file is intentionally readable by its URL even if it also appears in a draft. Use a different private file for an unreleased replacement.

Withdrawal/deletion hooks protect active published references to media, sources, and bundles, including the published snapshot retained beneath a newer draft. They also protect the configured site logo. Publication and dependency withdrawal share a transaction-scoped Postgres advisory lock, preventing a concurrent publish/privatize race. Saving newer source/bundle metadata drafts remains allowed. Guards read selected reference fields from paginated published snapshots through Payload; an indexed delivery-reference view can replace this rare administrative scan if the corpus grows very large without changing the content model.

The featured-embed caption data migration backfills only missing captions for existing published posts and their published versions, using the existing bundle title. It preserves editorial captions and draft-only content. Existing migrations remain immutable; data repairs use a new forward migration.

Private source notes and CMS account relationships are removed by field access control. Public bylines are stored separately from auth users. Public rich text supports a restricted editor feature set without arbitrary executable HTML or inline upload nodes; executable content belongs in isolated bundles.

User creation takes a transaction-scoped Postgres advisory lock before checking whether the collection is empty. This also covers Payload's native first-user operation, which intentionally bypasses collection access. Exactly one unauthenticated bootstrap request can create an account, and its administrator role is assigned by the server. Additional accounts require an authenticated admin, including trusted Local API provisioning; pass the acting admin as `user`. Editors and unauthenticated callers cannot supply their own role.

## Assets

Standard uploads use Payload's disk support or official S3 storage plugin, retaining Payload file access control. Bundle import uses the small `ObjectStorage` interface. Disk and S3 adapters use the same object keys and manifest format. New providers can implement that interface without changing the post schema.

Every bundle gets a random immutable version/prefix. Its manifest records paths, MIME types, lengths, and SHA-256 hashes. A new bundle version is a new Snippet document. Draft/published metadata can change; files and manifests cannot. Files are staged before creating the database record, and failed imports attempt to remove only objects written by that operation. Interrupted imports can leave unreferenced objects; storage lifecycle cleanup should reconcile manifests before deleting anything.

The embed server uses one explicit SQL query over the Snippet delivery contract. Database verification checks that query against the migrated schema. It has a separate entry point and exposes only GET/HEAD bundle delivery and a readiness endpoint. It does not import or expose the CMS application. The deployment gives it the preview-signing secret and storage credentials, but no Payload authentication secret.

## Database contracts

Committed Payload migrations define the upgrade path. The application wrapper holds a Postgres advisory lock across checksum verification and native migration execution. Each native migration writes its checksum inside the same transaction as its schema changes and Payload migration ledger entry. Unknown, edited, or unchecksummed applied migrations fail closed.

`hci_migration_checksums` is the wrapper's small operational ledger; it does not own application tables. The SQL snapshot includes it. `db:verify` creates a fresh database, runs the real runner, compares the SQL snapshot, checks Payload's configured columns against migrated columns, checks required indexes and embed SQL, and checks generated artifacts for drift.

The native Payload CLI is still used to generate migrations. Deployment must use `pnpm db:migrate`; directly invoking `payload migrate` bypasses the checksum wrapper. A pinned Payload 3.91 reconnect client prevents normal short-lived CLI exit, so scripts close application resources and explicitly exit after successful completion, following Payload's own CLI behavior. Integration tests isolate and terminate their temporary database connections.

## Deliberate boundaries

The template does not perform video transcoding, scrape evidence, run a JavaScript server inside a bundle, or install dependencies supplied by a bundle. Upload browser-playable MP4/WebM or link supported external video providers. Bundle code runs only in a browser sandbox. A future transcoding or research pipeline should run separately and produce ordinary Media/Source records.

Post slugs are currently editable and unique. Before changing a published slug, add a redirect or keep the old URL. Automatic redirect history, search indexing, localization, paid memberships, synchronized video playback, external CDN caching, and content syndication can be added independently. Avoid copying CMS records into a parallel content database for those features.
