# Storage selection and account setup

Research checked against official documentation on 2026-10-16. Prices below are USD list prices; hosting compute, databases, request charges, taxes and backup copies are additional where applicable.

## Selected setup

Use **Railway for the application, PostgreSQL and private Railway Buckets for media**. This is the selected deployment setup. Each Railway environment gets its own bucket instance and isolated credentials. The IaC graph creates the bucket and connects the web/CMS and embed services through native variable references, without copying access keys into shared variables. The application's S3 interface keeps the media model portable if storage needs change later. No Cloudflare account or R2 keys are required for this setup.

Store originals, image derivatives, audio, documents, datasets, downloadable ZIPs and extracted interactive bundles in object storage. PostgreSQL stores metadata, captions, relationships, ordering, access state and bundle manifests. CMS folders organize records; they do not rename object keys. Never rely on the application container filesystem for deployed uploads.

| Option                                                                  | Current pricing and behavior                                                                                                                                                                                      | Fit for this blog                                                                                                    |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [Railway Buckets](https://docs.railway.com/storage-buckets)             | $0.015/GB-month; bucket operations and egress free. Service proxying/uploads still consume service egress. Current S3 feature set excludes object versioning, object locks and lifecycle configuration.           | Selected primary storage. Private environment-isolated buckets with signed public downloads and independent backups. |
| [Cloudflare R2 Standard](https://developers.cloudflare.com/r2/pricing/) | $0.015/GB-month; 10 GB-month free monthly; first 1M Class A and 10M Class B operations free monthly, then $4.50/M and $0.36/M. Direct R2 egress is free.                                                          | Optional alternative; no R2 account is needed for the selected setup.                                                |
| [Amazon S3](https://aws.amazon.com/s3/pricing/)                         | Storage, operations and transfer vary by region/class. [Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) preserves prior object versions, including after overwrites/deletions. | Strong alternative primary store; particularly useful as an independently protected backup destination.              |

Railway currently charges service internet egress at [$0.05/GB](https://railway.com/pricing); [bucket and service egress are separate](https://docs.railway.com/storage-buckets/billing). Changing the bucket provider alone does not remove proxy delivery costs.

Railway Buckets currently have no object versioning, object locks or bucket lifecycle rules, so plan independent backups before accumulating production evidence. R2 has [bucket retention locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), but [its S3 API does not implement S3 versioning](https://developers.cloudflare.com/r2/api/s3/api/). These remain optional backup/provider alternatives. Retention and backups solve different problems; choose immutable backup retention separately from the active library, where rejected imports and deliberate media removal need cleanup.

## Delivery and large videos

The configured Payload adapter authorizes each media file before issuing an anonymous reader a five-minute signed S3 URL. The bucket stays private; new requests for private files are rejected. A URL already issued remains usable until it expires. Signed URLs are generated at request time, never saved in the database. Editor previews remain authenticated and proxied. Set `S3_SIGNED_DOWNLOADS=false` to proxy public delivery too when immediate revocation is required. This uses [Payload's supported signed-download adapter](https://payloadcms.com/docs/upload/storage-adapters).

Interactive bundles keep their separate origin and manifest checks, so they continue through the embed service. This deliberately trades a modest amount of service bandwidth for isolation and publication control. Keep large videos in ordinary Media or a video service rather than burying them inside ZIP bundles.

Server uploads default to **100 MiB per file**. `MEDIA_MAX_UPLOAD_MB` accepts integers from 1 to 500, and both file and complete-request limits are explicit. Payload rejects oversized uploads rather than saving truncated files. Interactive ZIP imports have independent 25 MiB compressed / 100 MiB expanded limits and bound incoming request bytes even without a Content-Length header.

For short screen recordings, browser-ready H.264/AAC MP4 or WebM uploads are enough. The app does not transcode uploaded originals. MOV files can be preserved as downloadable evidence; convert them for inline playback. For long recordings, unreliable connections or growing viewing traffic, use managed video with resumable browser uploads and adaptive playback:

- [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/) charges $5/month per 1,000 stored minutes of capacity and $1 per 1,000 delivered minutes, with encoding/ingress included. [Direct creator uploads](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/) support resumable tus uploads; tus is required above 200 MB. Stream can be integrated independently of the selected Railway object storage.
- [Mux](https://www.mux.com/docs/pricing/overview) is a strong alternative with basic on-demand input free; storage/delivery depend on resolution and quality. Compare its current included allowances against actual upload/watch minutes before selecting it.

Neither service's direct upload/webhook integration is implemented yet. Do not purchase it or supply video-service keys until the workload calls for it. That integration should add provider asset IDs, processing status, signed playback and verified webhooks while retaining the original Media/Source records. Keep archival originals when visual fidelity matters; adaptive encodes are delivery copies.

## What to set up and provide

1. **Railway:** select the workspace/project and development/production environments. For deployment CI, provide an environment-scoped project token per environment; keep the selected IDs in configuration. Select the app hostname and a separate embed hostname. No new provider account is needed if an existing one is suitable.
2. **Railway Buckets:** keep `HCI_STORAGE_PROVIDER=railway` (the IaC default). Select `HCI_BUCKET_REGION` before the first apply: `sjc`, `iad`, `ams` or `sin`. This placement cannot be changed after creation. Let the graph create the `assets` bucket in each environment; no external storage account or manually supplied production S3 keys are needed. Native references use Railway's generated `BUCKET`, `ENDPOINT`, `REGION`, `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` values. The active library needs read/write/delete and metadata/multipart operations. See the [deployment runbook](../.railway/README.md) for resource bootstrap and planning.
3. **Email:** connect an existing SMTP service or use [Resend SMTP](https://resend.com/docs/send-with-smtp) for CMS password recovery. It needs a verified sender domain and a sending key. Resend settings: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASSWORD=<sending key>`, and `SMTP_FROM=<verified address>`. No SMTP key is needed for local editing.
4. **Backups:** choose a separate destination and retention before real evidence is accumulated. See the recovery plan below. These credentials should be separate from the application runtime.

The following application variables are wired by IaC for deployment. For a local live-bucket test, copy values from that environment's Railway bucket **Credentials** tab into the ignored `.env`:

| Environment variable   | Railway source / purpose                                                            |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `STORAGE_DRIVER`       | `s3`                                                                                |
| `S3_BUCKET`            | `assets.BUCKET`: actual S3 name including Railway's suffix, not the display name    |
| `S3_ENDPOINT`          | `assets.ENDPOINT`: base endpoint from Credentials; do not prepend the bucket name   |
| `S3_REGION`            | `assets.REGION`: S3 signing region from Credentials, distinct from bucket placement |
| `S3_FORCE_PATH_STYLE`  | `false` for new Railway buckets (virtual-hosted URLs)                               |
| `S3_ACCESS_KEY_ID`     | `assets.ACCESS_KEY_ID`: generated bucket credential                                 |
| `S3_SECRET_ACCESS_KEY` | `assets.SECRET_ACCESS_KEY`: matching generated secret                               |
| `S3_SIGNED_DOWNLOADS`  | `true` by default                                                                   |
| `MEDIA_MAX_UPLOAD_MB`  | `100` initially                                                                     |

Railway's [bucket connection documentation](https://docs.railway.com/storage-buckets#connecting-to-your-bucket) describes these values and variable references. Older Railway buckets may require path-style URLs; check Credentials before connecting an existing bucket and adjust the owning IaC map if needed. Keep deployment tokens, application secrets and local bucket credentials in Railway variables or ignored local configuration through a secure channel; tell the agent which profile or file to use. Do not put secret values in chat, Git, screenshots or documentation.

The optional `HCI_STORAGE_PROVIDER=external-s3` path remains for future migrations to another S3-compatible provider. It omits the Railway bucket and instead reads the `HCI_S3_*` shared variables listed in [.railway/README.md](../.railway/README.md). These shared credentials are not required for the selected Railway setup.

Select the provider before the first apply. Changing the provider on an initialized graph can remove its owned Railway bucket; it requires a reviewed copy/verification/migration plan. Application portability does not imply that toggling a provider migrates existing objects.

After credentials are installed, run `pnpm storage:check`. It writes one randomly named isolated probe, verifies its bytes, and removes only that probe. It tests the actual selected endpoint, credentials and conditional-write support without listing unrelated objects or printing credentials. Then test a real CMS upload/private preview/public download, image derivative, ZIP import, relative module and video range request against the deployed services. SDK fixture tests do not establish actual provider access.

## Backup and recovery plan

Railway PostgreSQL volume backup schedules are configured: daily for dev; daily, weekly and monthly for production, reconciled by the infrastructure workflow. Before production evidence accumulates, also schedule independent logical database exports plus object copies. [Railway volume backups](https://docs.railway.com/volumes/backups) restore within the same project/environment and are removed when the volume is wiped; keep an independent copy for recovery outside that scope.

My proposed independent archive policy is 30 daily logical database snapshots and 12 monthly snapshots, plus a matching append-only object archive in a separate account or provider. This is separate from the configured Railway volume schedules and their provider retention. Use an AWS S3 backup bucket with versioning, or an R2 backup bucket with a separately selected retention lock. Application service keys must not be able to erase backup history. Independent export/copy jobs and protected object retention are not provisioned yet.

Back up the original media, derivatives, every bundle version and manifests, the database, and the source commit identifying its migrations. Do not configure age-based deletion of originals: old posts and retained revisions may still reference them. Backups must capture a coherent database/object set, through an editorial write pause or versioned inventory that accounts for concurrent edits. A database-only backup cannot reconstruct uploads.

Restore into an isolated environment first: restore Postgres and objects under their existing keys, configure independent secrets/domains, and verify private/public permissions, captions, source attachments, playback and manifest hashes. Test recovery before treating the backups as dependable. Object storage durability, CMS draft history and application reference guards do not substitute for a tested backup.

### Rehearse a local disk restore

Use a populated local test database in this repository's Compose PostgreSQL service and its matching disk storage directory. Include a public entry with uploaded evidence, a private draft, and an interactive bundle. Pause the web process, scheduled jobs, imports, and other writers for the duration of the copy. Run from the checkout whose migrations match the database.

```sh
bash scripts/rehearse-local-restore.sh hci_authoring_test /absolute/path/to/test-storage
```

The helper dumps PostgreSQL, archives the entire storage directory, records the current Git commit, verifies archive checksums, and restores into a newly created test database and a separate directory. It compares the restored file tree with the paused source, checks original and derivative file sizes against the restored media records, and verifies bundle hashes against current and versioned manifests. It prints both destinations and retains them for inspection. The temporary directory contains private records, files, and account password hashes. For a long-lived archive, use the protected independent destination described above.

Start a second web and embed service with the printed database name, the restored `objects` directory as `STORAGE_DIR`, distinct local origins and secrets, disk storage, and scheduled jobs disabled. Run `pnpm db:migrate` against that restored database to verify migration history. Through the restored services:

- Compare the signed-in draft with the source, including the order of its list revisions, items, text, and links.
- Check anonymously that the draft and private file are inaccessible. Sign in to read the private file. Open a published source attachment as an anonymous reader and verify that internal source notes stay private.
- Open a public post, compare downloaded originals with the source bytes, and request a video byte range.
- Fetch each public bundle file through the restored embed origin and compare its SHA-256 digest with its database manifest.

The disk rehearsal exercises PostgreSQL and the local storage adapter. A hosted recovery drill also needs an independent bucket archive, restored object keys, and verified access through the deployed S3 adapter.
