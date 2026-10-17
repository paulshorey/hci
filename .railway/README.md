# Railway deployment

The graph is prepared and type-checked; no Railway project, bucket, domain, or provider grant is implied by the repository configuration.

## Select the deployment target

Use a dedicated HCI project or the named `hci` partial within an explicitly selected shared project. The partial owns Postgres, the asset bucket, the web/CMS service, and the isolated embed service. Preserve other partials.

Before provisioning, decide the workspace/project, development and production environment IDs, public hostnames, and bucket region. Bucket region is required and immutable. The file refuses to evaluate without exact project/environment guards and a target of `development` or `production`.

Use the workspace's explicit local credential profile. Keep project/environment tokens and all secret values outside Git. Authenticate and verify the selected project before planning. A valid local type-check is not proof of provider access.

Pinned authoring SDK: `railway@3.16.0`. CI native CLI: `5.62.1`. Runtime: Node 24 / pnpm 10.28.1. Infrastructure is `.railway/railway.ts`; do not point the legacy Railway Config File setting at it.

## Environment bootstrap

For each environment, create the Railway environment and set these authoring variables locally and in the corresponding GitHub environment:

| Variable                     | Purpose                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| `HCI_RAILWAY_PROJECT_ID`     | Exact selected project; also a repository variable to enable CI |
| `HCI_RAILWAY_ENVIRONMENT_ID` | Exact selected environment                                      |
| `HCI_RAILWAY_TARGET`         | `development` or `production`                                   |
| `HCI_BUCKET_REGION`          | Explicit choice of `sjc`, `iad`, `ams`, or `sin`                |

GitHub environments are `development` and `production`. Each needs its own environment-scoped `RAILWAY_TOKEN` secret. Configure production approval protection as appropriate. Branches are `main` and `prod` respectively.

The graph references these Railway shared variables:

| Shared variable            | Value source                                      |
| -------------------------- | ------------------------------------------------- |
| `HCI_SITE_URL`             | Public HTTPS origin of the blog                   |
| `HCI_EMBED_ORIGIN`         | A different HTTPS origin for embeds               |
| `HCI_EMBED_PREVIEW_SECRET` | Independent random secret, at least 32 characters |
| `HCI_S3_BUCKET`            | Generated bucket name                             |
| `HCI_S3_ENDPOINT`          | Bucket's S3 endpoint                              |
| `HCI_S3_REGION`            | Bucket's S3 signing region                        |
| `HCI_S3_ACCESS_KEY_ID`     | Generated bucket credential reference             |
| `HCI_S3_SECRET_ACCESS_KEY` | Generated bucket credential reference             |

Set a separate random `PAYLOAD_SECRET` on the web service; IaC preserves it. Configure optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_FROM_NAME` on that service before relying on password recovery. Add those settings to the owning IaC environment map when enabling them.

For a confirmed empty environment, use the included resource-only bootstrap graph before enabling source deployments:

```sh
railway config plan --file .railway/bootstrap.ts
railway config apply --file .railway/bootstrap.ts
```

This creates the named database, bucket, and empty web/embed services without deploying application code. Obtain the bucket's actual endpoint/region/name and generate service domains, then fill the shared references and web secret before planning the complete graph below. Both files share the same resource definitions and partial ownership. **Never apply the bootstrap graph to an initialized environment:** its omitted configuration would remove application settings. Use the full graph for all subsequent operations. Never substitute example credentials or fake project IDs. Verify the complete plan contains no deletion of unrelated resources.

The Postgres image is pinned to major 17. The application build runs without reading the database, and pre-deploy runs `pnpm db:migrate` over private networking. Ensure the built image retains `src/migrations`, the scripts, and runtime dependencies. Neither service requires a writable application filesystem with S3 storage. Avoid persistent disk configuration across these two separate containers.

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
8. Enable database backups and retain matching object storage/version history. A database backup alone does not contain media files.

For production promotions, review all pending migrations and promote the complete reviewed `main` branch into `prod`. Prefer additive/backfill changes so the previous release can remain running while migrations apply. A failed migration blocks rollout; already committed earlier migrations remain applied. Restore from a tested backup or use a reviewed forward repair rather than automatically running down migrations.
