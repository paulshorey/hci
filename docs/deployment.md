# HCI deployment

Selected on 2026-10-17. Resource IDs are configuration, not credentials. Native Railway IaC owns the named `hci` partial; use `.railway/railway.ts` for subsequent changes.

| Setting                    | Value                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| GitHub                     | Private `paulshorey/hci`                                                       |
| Railway workspace          | `c64d0999-e00c-4c52-bbd4-2614210e3758` (existing Paul/WebArts workspace)       |
| Railway project            | `HCI`, `114d34ca-984f-43a0-b9ac-6e0d72ee489e`                                  |
| Dev environment            | `dev`, `5603e862-49cb-498b-a036-136264957f66`, source branch `main`            |
| Production environment     | `production`, `9b8cb8a9-31f2-4913-8fa4-75eafd25f0da`, source branch `prod`     |
| Bucket placement           | `iad` (Virginia), immutable; separate instance and credentials per environment |
| Compute/database placement | `us-east4-eqdc4a` (Virginia)                                                   |
| Application services       | `web` (Next.js/Payload) and `embeds` (isolated read-only bundles), port 8080   |
| Database                   | Managed PostgreSQL 17; public TCP proxy; forward-only migrations               |

| Environment | Web and CMS                                                                          | Isolated embeds                                                              | Automatic source |
| ----------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------- |
| Dev         | [web-dev-3ac0.up.railway.app](https://web-dev-3ac0.up.railway.app)                   | [embeds-dev.up.railway.app](https://embeds-dev.up.railway.app)               | `main`           |
| Production  | [web-production-10708e.up.railway.app](https://web-production-10708e.up.railway.app) | [embeds-production.up.railway.app](https://embeds-production.up.railway.app) | `prod`           |

Service IDs are shared across environments; instances, databases, volumes, bucket contents and credentials are isolated:

- Web: `c531648b-bf4b-416f-8f6e-a75f41eead83`.
- Embeds: `3845162b-8b74-4a7a-8cdf-396aa235594d`.
- PostgreSQL: `d76e29c5-e492-4fb1-abc2-b2a451d7e363`.
- Assets bucket definition: `a37e9531-c9b5-4af4-9f44-b26b66e9363d`, with separate `iad` instances per environment.

The user authorized a fresh Git history. The complete codebase was published as one initial commit on `main`, then `prod` was created from it. Subsequent deployment changes are ordinary commits on those branches. Earlier feature branches and the old local Git metadata were removed; closed historical GitHub PR records can still exist.

## Database connection contract

Both `web` and `embeds` require `DB_HCI_URL`, set by the full IaC graph to the native reference `${{postgres.DATABASE_PUBLIC_URL}}` in their own environment. Runtime, migrations and administrative database tools all use this project-specific key; they never fall back to a global `DATABASE_URL`. The managed PostgreSQL service retains Railway's own `DATABASE_URL` and `DATABASE_PUBLIC_URL` outputs.

Public access is intentional for this project. Dev uses `altaria.proxy.rlwy.net:43203`; production uses `switchyard.proxy.rlwy.net:24607`. Each TCP proxy forwards to PostgreSQL port 5432. The current SDK's database helper does not create an active proxy, so these endpoints were created with the native `railway tcp-proxy create --port 5432` command against each exact PostgreSQL environment instance. Preserve them and verify `railway tcp-proxy list` before attempting any creation. Never recreate a database to enable public access.

For a local command against a deployed database, obtain that environment's resolved `DB_HCI_URL` from Railway and pass it only to the intended process, or place it in ignored local configuration. Do not commit or log connection strings. The local `.env.example` and CI use local disposable PostgreSQL databases; `HCI_TEST_DATABASE_URL` remains the separate local-only test target. Switching deployed services to private networking is a future, deliberate IaC change.

## Credentials and first administrator

Local provider operations use `RAILWAY_API_TOKEN` from `~/.secrets.sh`; unset `RAILWAY_TOKEN`, require a nonempty API token, and do not print it. Clean noninteractive shells must receive the token explicitly. GitHub environments `development` and `production` each use their own environment-scoped `RAILWAY_TOKEN`. Non-secret authoring variables identify the exact project, environment, target and bucket region. Both services use native references to the environment's `assets` bucket.

Each web service has a distinct `PAYLOAD_SECRET` and bootstrap password. Each environment also has a distinct embed preview secret. The first administrator email is the authenticated GitHub account's address, `hello@paulshorey.com`. `pnpm cms:bootstrap` runs after migrations and before public startup; it creates the first administrator without logging credentials and leaves existing accounts unchanged. Generated initial credentials are stored only in owner-readable ignored `.local/railway/credentials.json` and the relevant Railway secret variables. Change the administrator passwords after first login. SMTP/password recovery is optional and must be configured before relying on email delivery.

## Multimedia CMS cutover

The multimedia CMS replacement uses a fresh baseline. Follow [the one-time reset runbook](cms-reset.md) before releasing it; ordinary startup must never discard an existing database. The local experimental schema was backed up and reset on 2026-10-24. Railway reset and release still require verified access to the exact environments above. Keep this change off `main` and `prod` until that coordinated cutover is possible.

The full graph enables `CMS_RUN_JOBS=true` only on the persistent web service. Payload processes native scheduled publish/unpublish jobs every minute. The isolated embed service does not execute editorial jobs.

## Operations

For an explicitly selected environment, source the profile, unset inherited project tokens, and export the corresponding `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `HCI_RAILWAY_PROJECT_ID`, `HCI_RAILWAY_ENVIRONMENT_ID`, `HCI_RAILWAY_TARGET` (`development` or `production`), `HCI_STORAGE_PROVIDER=railway` and `HCI_BUCKET_REGION=iad`. Use the pinned Node 24/pnpm toolchain and Railway CLI 5.62.1.

Review a fresh plan, apply it, and require a clean follow-up plan:

```sh
railway config plan --file .railway/railway.ts --out /secure/local/hci.plan.json
railway config apply --plan /secure/local/hci.plan.json --yes
railway config plan --file .railway/railway.ts --detailed-exit-code
```

Never use the resource-only bootstrap file against initialized environments. Do not enable destructive confirmation to bypass unexplained replacements. Do not seed production with sample articles or create test accounts there.

## Initial provisioning repairs

With CLI 5.62.1/SDK 3.16.0, the first managed PostgreSQL template initially launched PostgreSQL 18 despite the declared image pin. That new dev database was verified to have zero public tables and its empty environment was replaced by a fresh copy of the PostgreSQL 17 environment before application migrations. Both database instances now use `ghcr.io/railwayapp-templates/postgres-ssl:17`. Never apply this empty-bootstrap recovery procedure to a database containing application data or try to downgrade its physical data directory.

The same CLI initially created the project-level bucket definition without its environment instances. The native CLI's own bucket-create implementation supplies `isCreated: true` when committing the environment bucket patch. Applying that narrowly scoped patch with `region: iad` to the existing assets definition initialized both instances. Subsequent full IaC plans were clean and both live buckets passed isolated write/read/delete probes. If future provisioning shows this defect, inspect actual bucket instance state before taking action; do not create duplicate bucket definitions or copy credentials into source code.

## Backups and release verification

`scripts/configure-backups.ts` owns the supplemental backup configuration not exposed by the current IaC SDK. The infrastructure workflow runs it after push applies. Dev has daily PostgreSQL volume backups; production has daily, weekly and monthly schedules. Schedule read-back is verified. Current provider retention is 6 days for daily snapshots, 27 days for weekly snapshots and 89 days for monthly snapshots. These are provider-managed volume backups; independent logical database exports, media/bundle archives and an isolated restore drill remain separate work. A database volume backup contains no uploaded media.

For every release, verify both web and embed deployment states and source commits, the web `/api/health` endpoint and embed `/health`, migration/bootstrap completion in the web pre-deploy logs, and a clean full IaC plan. The authenticated editor should also verify uploads, private/public delivery, slideshow captions and interactive bundle previews. GitHub source branch triggers were read back for both services in both environments; source pushes trigger builds independently of the infrastructure workflow.
