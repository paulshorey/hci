# Multimedia CMS architecture

## Installation boundary

The CMS is reusable code, with a separate installation and data store for each website. The root application is HCI's first client. `packages/multimedia-cms` owns content semantics; `packages/multimedia-renderers` provides optional server React rendering and client carousel/frame behavior. Website routes, branding and host-only admin links remain in `src`. The embed service is a separate runtime and origin.

`createMultimediaCMS` receives the installation directory and database URL; the core package never reads an HCI database key. The HCI host explicitly requires `DB_HCI_URL`, including for migrations. The host supplies optional navigation/help components; the CMS works without them.

## Content and identity

The model is `Entry -> ordered content-list relationships -> items -> typed blocks`. The initial list relation is mandatory and server-created automatically. The admin UI shows this as standard **Primary content**, without a relationship picker or a remove-list control. Further relationships are optional supplemental content. All list contents, items and media types are optional, even on a published entry.

Entries contain title, slug, optional short description, publication state/date, visibility, author/taxonomy/source references and SEO metadata. They contain no body or featured-media columns. The first content list supplies primary content; websites choose how to display the remaining lists. Every list supports the same rich text, image, video, audio, link, download and interactive-bundle blocks. Adding a block extends the owning Payload definition and renderer. Asset/source references are collected from those field definitions, rather than duplicated per entry location.

Content lists are independent records with stable logical keys, a title, presentation preference and ordered items. Items have stable logical keys, an optional heading/layout and an optional blocks array. SQL row IDs identify a specific revision; logical keys preserve frontend anchors across revisions. Multiple instances of the same block type are valid. Missing media is simply absent, with no synchronized arrays or null padding.

## Immutable revisions and editing

An entry revision stores relationships to fixed content-list records. Before any entry save, including a draft, all referenced lists are sealed in the same database transaction. Sealed content cannot be updated or deleted through CMS APIs. Opening the entry's content editor starts a copy; saving creates a new content-list record and updates that relationship in the entry form. It does not mutate the old record. New SQL row IDs are assigned while logical list/item keys, captions and references are preserved.

This avoids a parent version pointing at a mutable child. Draft changes, scheduled publication and restoring an old entry version preserve the selected list structure. Media files, sources and bundles remain reusable library relationships, rather than binary copies inside each revision. Library metadata has its own editing/version rules.

Unused, unsealed editor-created lists remain private and may be removed by an administrator. Sealed records are retained for history. There is no automatic destructive garbage collector; future pruning must reconcile current entries, entry versions and asset references first.

## Publishing and permissions

Public entry access requires both `_status=published` and `visibility=public`. Authenticated editors can read private entries and drafts. Draft preview requires authentication on every read, is dynamic, and is noindex. CMS user relationships and source research notes are private. Public Local API operations explicitly set `overrideAccess:false`.

A content list's `public` flag is derived solely from current public/published entry references. Entry publication, withdrawal, visibility changes and deletion reconcile only affected list IDs through indexed relationship queries, in the same transaction. A shared list remains public while at least one live public entry references it. New draft revisions do not change these flags. Callers cannot set public/sealed state; the narrowly scoped internal adapter operation updates only those two flags.

Entry saves and dependency withdrawal share a PostgreSQL transaction advisory lock. Publishing a public entry validates referenced media visibility, file types, captions, alt text, sources and bundles. Empty content stays valid. Private published entries may retain private files. Media bytes cannot be replaced or deleted while referenced by a saved list; public media cannot be privatized while used by a public list. Source/bundle withdrawal protects live public references; deletion also protects sealed-list history. Site logos and published source attachments retain their library safeguards.

Users retain admin/editor roles. The first-user operation is serialized and assigns the administrator role on the server. Additional account creation requires an acting administrator. Jobs use Payload's native scheduled-publish task, which restores the scheduling user's current identity and re-enters entry access control and publishing hooks. Persistent Railway web instances run queued jobs every minute when `CMS_RUN_JOBS=true`; local tests run jobs explicitly. Administrators can inspect the read-only Jobs collection; editors and anonymous requests cannot read job inputs or logs.

## Files and executable bundles

Media records own file metadata and default descriptions/credits. Captions, contextual image descriptions and source relationships belong to block placements. Standard files use Payload's disk adapter locally and official S3 adapter with private Railway Buckets when deployed. Storage object keys and manifests are independent from website presentation.

Interactive bundles retain validated ZIP/folder import, immutable file manifests, bounded extraction, MIME/path/integrity checks and independent storage prefixes. HTML/CSS/JS executes only in a separate-origin browser sandbox; the embed server exposes no CMS routes, uploads or server-side execution. Draft preview capabilities are short-lived and scoped to one bundle. Byte ranges, authorization and revalidation remain enforced. Public media uses short-lived signed URLs after authorization; editor delivery remains proxied.

## Database contracts and operational reset

Payload owns the PostgreSQL schema. Lists/items/blocks become normalized child tables with typed relationships and ordering; rich text and immutable manifests use JSONB. Entries store media only through content-list relationships. Draft/version tables and the native jobs queue are generated by Payload. There is no second ORM schema or unrestricted content JSON object.

The discarded experimental blog baseline was explicitly authorized for removal on 2026-10-24. `schema/baseline-reset.json` records the exact old Git blobs that the migration-history check may permit deleting. It grants no exception for modifying or deleting the new baseline. Existing deployed schemas require the documented one-time guarded reset; normal deployment never resets data automatically.

`pnpm db:migrate` holds a migration lock and records checksums transactionally in `cms_migration_checksums`. Unknown or edited applied files fail closed. `pnpm db:verify` migrates a fresh disposable local database, compares the SQL snapshot, verifies generated Payload columns/types/indexes/foreign keys and embed SQL, and checks generated contracts for drift. All future changes use forward migrations.
