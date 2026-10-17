# HCI deployment

Selected on 2026-10-17. Resource IDs are configuration, not credentials. Native Railway IaC owns the named `hci` partial; use `.railway/railway.ts` for subsequent changes.

| Setting                    | Value                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| GitHub                     | Private `paulshorey/hci`                                                       |
| Railway workspace          | `c64d0999-e00c-4c52-bbd4-2614210e3758` (existing Paul/WebArts workspace)       |
| Railway project            | `HCI`, `114d34ca-984f-43a0-b9ac-6e0d72ee489e`                                  |
| Dev environment            | `dev`, `295e43da-5179-4377-9330-0a43036de1cc`, source branch `main`            |
| Production environment     | `production`, `9b8cb8a9-31f2-4913-8fa4-75eafd25f0da`, source branch `prod`     |
| Bucket placement           | `iad` (Virginia), immutable; separate instance and credentials per environment |
| Compute/database placement | `us-east4-eqdc4a` (Virginia)                                                   |
| Application services       | `web` (Next.js/Payload) and `embeds` (isolated read-only bundles), port 8080   |
| Database                   | Managed PostgreSQL 17; private networking; forward-only migrations             |

The user authorized a fresh Git history. The complete codebase was published as one initial commit on `main`, then `prod` was created from it. Subsequent deployment changes are ordinary commits on those branches. Earlier feature branches and the old local Git metadata were removed; closed historical GitHub PR records can still exist.

## Credentials and first administrator

Local provider operations explicitly select the existing `railway.webarts` profile at `~/.config/railway/webarts.env`; do not print its token. GitHub environments `development` and `production` each use their own environment-scoped `RAILWAY_TOKEN`. Non-secret authoring variables identify the exact project, environment, target and bucket region. Both services use native references to the environment's `assets` bucket.

Each web service has a distinct `PAYLOAD_SECRET` and bootstrap password. Each environment also has a distinct embed preview secret. The first administrator email is the authenticated GitHub account's address, `hello@paulshorey.com`. `pnpm cms:bootstrap` runs after migrations and before public startup; it creates the first administrator without logging credentials and leaves existing accounts unchanged. Generated initial credentials are stored only in owner-readable ignored `.local/railway/credentials.json` and the relevant Railway secret variables. Change the administrator passwords after first login. SMTP/password recovery is optional and must be configured before relying on email delivery.

## Operations

For an explicitly selected environment, source the profile, unset inherited project tokens, and export the corresponding `RAILWAY_PROJECT_ID`, `RAILWAY_ENVIRONMENT_ID`, `HCI_RAILWAY_PROJECT_ID`, `HCI_RAILWAY_ENVIRONMENT_ID`, `HCI_RAILWAY_TARGET` (`development` or `production`), `HCI_STORAGE_PROVIDER=railway` and `HCI_BUCKET_REGION=iad`. Use the pinned Node 24/pnpm toolchain and Railway CLI 5.62.1.

Review a fresh plan, apply it, and require a clean follow-up plan:

```sh
railway config plan --file .railway/railway.ts --out /secure/local/hci.plan.json
railway config apply --plan /secure/local/hci.plan.json --yes
railway config plan --file .railway/railway.ts --detailed-exit-code
```

Never use the resource-only bootstrap file against initialized environments. Do not enable destructive confirmation to bypass unexplained replacements. Public domains, service IDs, deployment verification and backup status are recorded here after provisioning completes. Do not seed production with sample articles or create test accounts there.
