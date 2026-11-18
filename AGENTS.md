# Project: HCI multimedia publishing

Reusable research blog and multimedia CMS built with Next.js, Payload, and PostgreSQL.

## Workspace

Prefer the primary local checkout when free; use a worktree when another task is
using it. After merging a PR, return the primary checkout to `main` and run
`git pull --ff-only` when free, leaving it clean.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Content and database ownership

Read [README.md](README.md) and [the architecture](docs/architecture.md) before
changing the model. Preserve unrelated work. The reusable CMS lives in
`packages/multimedia-cms` and renderers in `packages/multimedia-renderers`; the
root Next.js application is the HCI client. Payload collections/blocks own the
schema; generated files are derived. Entries reference ordered immutable
content-list revisions. Reordering must retain list items, blocks, captions, and
sources. The first list relation is mandatory; all list contents are optional.

Use `pnpm db:migrate` and forward migrations; update generated contracts and the
SQL snapshot together. Never enable schema push, edit applied migrations, run
destructive commands on deployed databases, or bypass public access controls
through Local API defaults. Tests use disposable local databases.

## Publishing and deployment

Executable bundles stay on a separate origin without CMS routes/cookies. Preserve
validated imports, immutable manifests, publishing checks, short-lived draft
previews, and sandbox restrictions on external dependencies.

Run relevant README checks. Verify the exact Railway project, environment, bucket
region, domains, and credential references in [docs/deployment.md](docs/deployment.md).
Use the full graph for existing environments; never bootstrap an initialized one.

# Research and report

If something goes wrong, stop the affected operation and report the relevant findings,
data, and logs. Redact secrets and private content.
When unsure, research before deciding: search the web for current techniques and best practices.

# Next steps

Consider what was recently done, what is in progress, and how it serves the goal.
Decide and recommend what to do next.

# Improve your instructions

Before you finish, look back at how the work went: where you struggled, which
troubleshooting took longest, and which instructions, tools, or skills were missing,
wrong, or unclear. Fix what would help the next agent. Put project lessons in this
file or the project's docs, and lessons for every project in the shared skills at
`~/.agents/skills/` (linked at `~/.claude/skills/`); `~/.agents/AGENTS.md` explains
how to save those. Keep each edit short and specific, tell the user what you changed,
and propose larger changes instead of making them.

# Goal: Publish reusable, source-backed research with rich multimedia
