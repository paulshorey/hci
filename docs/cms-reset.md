# One-time experimental CMS cutover

The owner explicitly authorized discarding the unused blog schema and experimental data on 2026-10-24. This is a one-time transition to the multimedia CMS baseline, not a recurring migration strategy. Do not run native migration reset/down or enable schema push.

The old blog migration files are removed. The new migration creates entries, separate content lists, typed item blocks, jobs and the retained media/source/bundle/auth structures from an empty application schema. `scripts/check-migration-history.mjs` permits deleting only the exact old Git blobs recorded in `schema/baseline-reset.json`; the manifest content is pinned in the guard so it cannot be expanded by a later PR. New migrations remain immutable.

## Before resetting

1. Complete local contract, integration, editor/browser and production-build checks. Review the PR and full Railway plans.
2. Verify actual access to the exact HCI project, environment, service and public database endpoint recorded in `deployment.md`. A stale credential or hostname is a stop condition; never substitute another project.
3. Supply only that environment's resolved public connection string as `DB_HCI_URL` to the intended process. Use PostgreSQL 17 client tools. Do not print connection strings or commit them.
4. Account for a maintenance window: the old application is incompatible with the new schema. Buckets, volumes, PostgreSQL service definitions, domains and provider secrets remain intact. Stored objects are preserved; record inventories before any later orphan cleanup.

## Execute the specifically authorized reset

```sh
pnpm db:reset-experimental --environment local --acknowledge discard-experimental-content-20261024
# Or select development / production with that exact target's DB_HCI_URL.
pnpm db:migrate
pnpm cms:bootstrap
```

The reset command verifies the exact host/port/database for the named environment, confirms the old experimental tables and all six expected migration names, takes an owner-readable logical backup under ignored `.local/database-backups`, and transactionally replaces only the application `public` schema. It does not replace the Railway PostgreSQL service or volume. It refuses unknown/mixed schemas. If the new baseline already exists, it preserves all new data instead of resetting again.

Recreate the administrator through the existing securely configured bootstrap credentials. Never seed sample content in Railway. Update the root application's ignored local `.env` only when selecting an intended local database; test databases remain separate.

## Release and verify

Perform development first, then the full reviewed `main` to `prod` promotion. Apply the full IaC graph, including `CMS_RUN_JOBS=true` on the persistent web service. Never apply the bootstrap graph to initialized environments. Confirm exact-commit successful web/embed deployments, web `/api/health`, embed `/health`, migration/checksum state, administrator access, scheduled job execution and clean post-apply plans.

The replacement baseline deliberately refuses to migrate the old application database in place. Do not merge the release while reset access is unavailable and do not bypass checksum failures. Keep the PR reviewable until the coordinated reset/deployment can be completed.
