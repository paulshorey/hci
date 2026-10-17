# Railway deployment

The graph is prepared and type-checked; no Railway project, bucket, domain, or provider grant is implied by the repository configuration.

The selected HCI project and environment IDs are recorded in [deployment details](../docs/deployment.md). Compute and PostgreSQL use Virginia `us-east4-eqdc4a`; both buckets use the user-selected immutable `iad` region.

## Select the deployment target

Use a dedicated HCI project or the named `hci` partial within an explicitly selected shared project. The partial owns Postgres, a private Railway asset bucket, the web/CMS service, and the isolated embed service. Preserve other partials. Railway Buckets are the selected primary storage provider; each environment has an isolated bucket instance and credentials.

Before provisioning, decide the workspace/project, development and production environment IDs, public hostnames, and bucket region. Bucket region is required and immutable. Keep `HCI_STORAGE_PROVIDER=railway` (the default). An optional `external-s3` path is retained for future provider migrations; switching it on an initialized graph can remove the owned Railway bucket and requires a separate verified data migration. The file refuses to evaluate without exact project/environment guards and a target of `development` or `production`.

Use the workspace's explicit local credential profile. Keep project/environment tokens and all secret values outside Git. Authenticate and verify the selected project before planning. A valid local type-check is not proof of provider access.

Pinned authoring SDK: `railway@3.16.0`. CI native CLI: `5.62.1`. Runtime: Node 24 / pnpm 10.28.1. Infrastructure is `.railway/railway.ts`; do not point the legacy Railway Config File setting at it.

## Environment bootstrap

For each environment, create the Railway environment and set these authoring variables locally and in the corresponding GitHub environment:

| Variable                     | Purpose                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `HCI_RAILWAY_PROJECT_ID`     | Exact selected project; also a repository variable to enable CI                             |
| `HCI_RAILWAY_ENVIRONMENT_ID` | Exact selected environment                                                                  |
| `HCI_RAILWAY_TARGET`         | `development` or `production`                                                               |
| `HCI_STORAGE_PROVIDER`       | `railway` (selected and default); `external-s3` reserved for an explicit provider migration |
| `HCI_BUCKET_REGION`          | Railway buckets only: `sjc`, `iad`, `ams`, or `sin`                                         |

GitHub environments are `development` and `production`. Each needs its own environment-scoped `RAILWAY_TOKEN` secret. Configure production approval protection as appropriate. Branches are `main` and `prod` respectively.

The graph references these Railway shared variables:

| Shared variable            | Value source                                      |
| -------------------------- | ------------------------------------------------- |
| `HCI_SITE_URL`             | Public HTTPS origin of the blog                   |
| `HCI_EMBED_ORIGIN`         | A different HTTPS origin for embeds               |
| `HCI_EMBED_PREVIEW_SECRET` | Independent random secret, at least 32 characters |

Both services obtain storage credentials directly from the native `assets` bucket using `ref(assets, 'BUCKET')`, `ENDPOINT`, `REGION`, `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY`. Railway resolves these within the selected environment. No `HCI_S3_*` shared variables or copied S3 secrets are required for this deployment. The graph uses virtual-hosted URLs (`S3_FORCE_PATH_STYLE=false`) for new Railway buckets. `REGION` is the signing region supplied by the bucket, not `HCI_BUCKET_REGION`, which controls immutable physical placement. Use `BUCKET`, not the display name `RAILWAY_BUCKET_NAME`.

Only the optional `external-s3` path requires these additional shared variables:

| Shared variable            | Value source                               |
| -------------------------- | ------------------------------------------ |
| `HCI_S3_BUCKET`            | Generated bucket name                      |
| `HCI_S3_ENDPOINT`          | Bucket's S3 endpoint                       |
| `HCI_S3_REGION`            | Bucket's S3 signing region                 |
| `HCI_S3_ACCESS_KEY_ID`     | Generated bucket credential reference      |
| `HCI_S3_FORCE_PATH_STYLE`  | `true` for R2; provider-specific otherwise |
| `HCI_S3_SECRET_ACCESS_KEY` | Generated bucket credential reference      |

Set separate random `PAYLOAD_SECRET`, `CMS_BOOTSTRAP_EMAIL` and `CMS_BOOTSTRAP_PASSWORD` values on the web service; IaC preserves them. The bootstrap password must have at least 32 characters. Pre-deploy runs migrations and then `pnpm cms:bootstrap` before the CMS serves traffic. This creates an administrator only when the user collection is empty; subsequent releases never replace accounts or reset passwords. Keep its generated password in a secure local store and change it after first login. No bootstrap credentials are supplied to the embed service.

Configure optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_FROM_NAME` on the web service before relying on password recovery. Add those settings to the owning IaC environment map when enabling them.

For a confirmed empty environment, use the included resource-only bootstrap graph before enabling source deployments:

```sh
railway config plan --file .railway/bootstrap.ts
railway config apply --file .railway/bootstrap.ts
```

This creates the named database, Railway bucket, and empty web/embed services without deploying application code. Generate service domains targeting port 8080, then fill the three application shared variables and web secrets before planning the complete graph below. Native bucket credentials are connected by the full graph. Both files share the same resource definitions and partial ownership. **Never apply the bootstrap graph to an initialized environment:** its omitted configuration would remove application settings. Use the full graph for all subsequent operations. Never substitute example credentials or fake project IDs. Verify the complete plan contains no deletion of unrelated resources.

The Postgres image is pinned to major 17. The application build runs without reading the database, and pre-deploy runs `pnpm db:migrate` over private networking. Ensure the built image retains `src/migrations`, the scripts, and runtime dependencies. Public media delivery uses five-minute signed bucket URLs after authorization; authenticated editor delivery and isolated bundles remain proxied. Neither service requires a writable application filesystem with S3 storage. Avoid persistent disk configuration across these two separate containers.

## Plan, apply, verify

```sh
railway config plan --file .railway/railway.ts
railway config apply --file .railway/railway.ts
railway config plan --file .railway/railway.ts --detailed-exit-code
```

Read the complete plan before applying. Do not add destructive-confirmation flags to make an unexplained replacement pass. Database and bucket replacements require a separate migration/recovery plan.

The workflow plans same-repository PRs without applying. On `main`/`prod` pushes, it makes a fresh saved plan, verifies that the source commit remains the branch head, applies that plan, and requires a clean follow-up plan. It is disabled until the project variable is configured. A source push alone does not evaluate the TypeScript graph.

After provisioning or release:

1. Confirm the web and embed deployments reach success at the intended source commit.
2. Inspect pre-deploy migration completion and `pnpm db:status`; compare migration names/checksums before any manual recovery.
3. Request `/api/health` on the blog and `/health` on the embed origin.
4. Create the first admin account before accepting ordinary editorial use.
5. Verify draft pages/files/bundles are private, and published media and captions render correctly.
6. Import and publish a bundle; verify relative modules, CSS, JSON, images and video seeking through the live storage provider.
7. Verify the embed origin cannot read blog cookies or expose CMS routes, and that public media survives a redeployment.
8. Enable database backups and retain matching independent object copies. Railway Buckets currently lack object versioning/locks/lifecycle rules; select a protected backup destination and test an isolated restore. A database backup alone does not contain media files.

For production promotions, review all pending migrations and promote the complete reviewed `main` branch into `prod`. Prefer additive/backfill changes so the previous release can remain running while migrations apply. A failed migration blocks rollout; already committed earlier migrations remain applied. Restore from a tested backup or use a reviewed forward repair rather than automatically running down migrations.

For current storage/provider costs, credentials, video-service choices and the backup/recovery plan, see [storage options and setup](../docs/storage-options.md). Provider selection changes authoring only; this repository does not provision external R2/AWS accounts or silently migrate objects.
