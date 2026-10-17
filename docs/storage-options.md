# Storage selection and account setup

Research checked against official documentation on 2026-10-16. Prices below are USD list prices; hosting compute, databases, request charges, taxes and backup copies are additional where applicable.

## Recommended setup

Use **Railway for the application and PostgreSQL, and a private Cloudflare R2 bucket for media**. This is an engineering recommendation for a growing, manually curated media library: the existing S3 interface works with R2, storage remains portable, public files can download directly without Railway proxy bandwidth, and R2 can be managed separately from the application host. Railway Buckets are a good simpler alternative if keeping one provider matters more.

Store originals, image derivatives, audio, documents, datasets, downloadable ZIPs and extracted interactive bundles in object storage. PostgreSQL stores metadata, captions, relationships, ordering, access state and bundle manifests. CMS folders organize records; they do not rename object keys. Never rely on the application container filesystem for deployed uploads.

| Option                                                                  | Current pricing and behavior                                                                                                                                                                                      | Fit for this blog                                                                                       |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Cloudflare R2 Standard](https://developers.cloudflare.com/r2/pricing/) | $0.015/GB-month; 10 GB-month free monthly; first 1M Class A and 10M Class B operations free monthly, then $4.50/M and $0.36/M. Direct R2 egress is free.                                                          | Recommended primary storage. Private bucket with S3 credentials and signed public downloads.            |
| [Railway Buckets](https://docs.railway.com/storage-buckets)             | $0.015/GB-month; bucket operations and egress free. Service proxying/uploads still consume service egress. Current S3 feature set excludes object versioning, object locks and lifecycle configuration.           | Simplest account setup. Suitable primary storage with independent backups.                              |
| [Amazon S3](https://aws.amazon.com/s3/pricing/)                         | Storage, operations and transfer vary by region/class. [Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) preserves prior object versions, including after overwrites/deletions. | Strong alternative primary store; particularly useful as an independently protected backup destination. |

Railway currently charges service internet egress at [$0.05/GB](https://railway.com/pricing); [bucket and service egress are separate](https://docs.railway.com/storage-buckets/billing). Changing the bucket provider alone does not remove proxy delivery costs.

R2 has [bucket retention locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/), but [its S3 API does not implement S3 versioning](https://developers.cloudflare.com/r2/api/s3/api/). Retention and backups solve different problems. Do not lock the active application bucket by default: rejected imports and deliberate media removal need cleanup. Choose any immutable backup retention separately, before enabling it.

## Delivery and large videos

The configured Payload adapter authorizes each media file before issuing an anonymous reader a five-minute signed S3 URL. The bucket stays private; new requests for private files are rejected. A URL already issued remains usable until it expires. Signed URLs are generated at request time, never saved in the database. Editor previews remain authenticated and proxied. Set `S3_SIGNED_DOWNLOADS=false` to proxy public delivery too when immediate revocation is required. This uses [Payload's supported signed-download adapter](https://payloadcms.com/docs/upload/storage-adapters).

Interactive bundles keep their separate origin and manifest checks, so they continue through the embed service. This deliberately trades a modest amount of service bandwidth for isolation and publication control. Keep large videos in ordinary Media or a video service rather than burying them inside ZIP bundles.

Server uploads default to **100 MiB per file**. `MEDIA_MAX_UPLOAD_MB` accepts integers from 1 to 500, and both file and complete-request limits are explicit. Payload rejects oversized uploads rather than saving truncated files. Interactive ZIP imports have independent 25 MiB compressed / 100 MiB expanded limits and bound incoming request bytes even without a Content-Length header.

For short screen recordings, browser-ready H.264/AAC MP4 or WebM uploads are enough. The app does not transcode uploaded originals. MOV files can be preserved as downloadable evidence; convert them for inline playback. For long recordings, unreliable connections or growing viewing traffic, use managed video with resumable browser uploads and adaptive playback:

- [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing/) charges $5/month per 1,000 stored minutes of capacity and $1 per 1,000 delivered minutes, with encoding/ingress included. [Direct creator uploads](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/) support resumable tus uploads; tus is required above 200 MB. This is my preferred next integration if one Cloudflare account already hosts R2.
- [Mux](https://www.mux.com/docs/pricing/overview) is a strong alternative with basic on-demand input free; storage/delivery depend on resolution and quality. Compare its current included allowances against actual upload/watch minutes before selecting it.

Neither service's direct upload/webhook integration is implemented yet. Do not purchase it or supply video-service keys until the workload calls for it. That integration should add provider asset IDs, processing status, signed playback and verified webhooks while retaining the original Media/Source records. Keep archival originals when visual fidelity matters; adaptive encodes are delivery copies.

## What to set up and provide

1. **Railway:** select the workspace/project and development/production environments. For deployment CI, provide an environment-scoped project token per environment; keep the selected IDs in configuration. Select the app hostname and a separate embed hostname. No new provider account is needed if an existing one is suitable.
2. **Primary storage:** create separate private development and production buckets. For R2, generate an Object Read & Write S3 credential scoped to the selected bucket(s), not an account-wide administration token. Supply the values below through ignored local environment configuration and the corresponding Railway secrets. AWS/Railway use the equivalent bucket-scoped credentials available from that provider. The active library needs read, write, delete and the adapter's metadata/multipart operations; enable no public bucket access.
3. **Email:** connect an existing SMTP service or use [Resend SMTP](https://resend.com/docs/send-with-smtp) for CMS password recovery. It needs a verified sender domain and a sending key. Resend settings: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASSWORD=<sending key>`, and `SMTP_FROM=<verified address>`. No SMTP key is needed for local editing.
4. **Backups:** choose a separate destination and retention before real evidence is accumulated. See the recovery plan below. These credentials should be separate from the application runtime.

| Environment variable   | R2 example / purpose                                    |
| ---------------------- | ------------------------------------------------------- |
| `STORAGE_DRIVER`       | `s3`                                                    |
| `S3_BUCKET`            | Exact private bucket name                               |
| `S3_ENDPOINT`          | `https://<account-id>.r2.cloudflarestorage.com`         |
| `S3_REGION`            | `auto`                                                  |
| `S3_FORCE_PATH_STYLE`  | `true` for R2; provider-specific for other S3 endpoints |
| `S3_ACCESS_KEY_ID`     | Bucket-scoped S3 access key                             |
| `S3_SECRET_ACCESS_KEY` | Matching S3 secret                                      |
| `S3_SIGNED_DOWNLOADS`  | `true` by default                                       |
| `MEDIA_MAX_UPLOAD_MB`  | `100` initially                                         |

Place secrets directly in Railway service/shared variables or the ignored local `.env` through a secure channel; tell the agent which profile or file to use. Do not put values in chat, Git, screenshots or documentation. A Cloudflare DNS token is only needed if custom domain configuration will also be delegated; it is separate from R2 storage credentials.

For R2/AWS storage, set the IaC authoring variable `HCI_STORAGE_PROVIDER=external-s3`. This omits creation of a Railway bucket while keeping the same service/storage variable contract. The default `railway` still creates the native bucket and requires its immutable region. Set `HCI_S3_FORCE_PATH_STYLE` in Railway shared variables (`true` for R2). See [.railway/README.md](../.railway/README.md).

Select the provider before the first apply. Changing the provider on an initialized graph can remove its owned Railway bucket; it requires a reviewed copy/verification/migration plan. Application portability does not imply that toggling a provider migrates existing objects.

After credentials are installed, run `pnpm storage:check`. It writes one randomly named isolated probe, verifies its bytes, and removes only that probe. It tests the actual selected endpoint, credentials and conditional-write support without listing unrelated objects or printing credentials. Then test a real CMS upload/private preview/public download, image derivative, ZIP import, relative module and video range request against the deployed services. SDK fixture tests do not establish actual provider access.

## Backup and recovery plan

Before production content is added, enable Railway PostgreSQL volume backups and schedule independent logical database exports plus object copies. [Railway volume backups](https://docs.railway.com/volumes/backups) restore within the same project/environment and are removed when the volume is wiped; keep an independent copy for recovery outside that scope.

My proposed starting policy is 30 daily database snapshots and 12 monthly snapshots, plus a matching append-only object archive in a separate account or provider. Use an AWS S3 backup bucket with versioning, or an R2 backup bucket with a separately selected retention lock. Application service keys must not be able to erase backup history. There is no unattended backup job or retention policy provisioned by this change.

Back up the original media, derivatives, every bundle version and manifests, the database, and the source commit identifying its migrations. Do not configure age-based deletion of originals: old posts and retained revisions may still reference them. Backups must capture a coherent database/object set, through an editorial write pause or versioned inventory that accounts for concurrent edits. A database-only backup cannot reconstruct uploads.

Restore into an isolated environment first: restore Postgres and objects under their existing keys, configure independent secrets/domains, and verify private/public permissions, captions, source attachments, playback and manifest hashes. Test recovery before treating the backups as dependable. Object storage durability, CMS draft history and application reference guards do not substitute for a tested backup.
