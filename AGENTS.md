<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project ownership

Read README.md and docs/architecture.md before changing the content model. Payload collections/blocks own the schema; generated files are derived. Keep posts, slides, content blocks, captions, and sources together when reordering. Preserve unrelated work.

Use pnpm db:migrate for database changes. Never enable automatic schema push, modify applied migrations, run destructive migration commands on deployed databases, or bypass public access control with Local API defaults. Update generated contracts and the SQL snapshot with forward migrations. Tests use their own disposable local databases.

Executable bundles must remain on a separate origin without CMS routes/cookies. Keep validated imports, immutable file manifests, publishing checks, and short-lived draft preview access intact. Do not relax sandbox policies to make arbitrary external dependencies load.

Run the relevant checks documented in README.md. The Railway graph is preparation only until the user selects a target project, environment, immutable bucket region, and domains. Do not apply bootstrap configuration to an initialized environment.
