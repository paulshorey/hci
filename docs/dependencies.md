# Dependency pins and overrides

The lockfile pins Payload and its official packages together at 3.91.0, Next.js at 16.4.2, and compatible React/TypeScript tooling. Node 24 is the supported application and CI runtime.

Scoped overrides in `pnpm-workspace.yaml` remove advisories inherited from the pinned upstream dependency graph:

- `@payloadcms/next > sass` uses 1.105.2. Payload pins Sass 1.77.4, which pulls the old Chokidar/Braces chain. Current Sass avoids that chain and its unpatched stack-exhaustion advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `monaco-editor > dompurify` uses 3.4.17 to include the patches for [GHSA-p98j-92pf-mc4p](https://github.com/advisories/GHSA-p98j-92pf-mc4p) and [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2).
- `@esbuild-kit/core-utils > esbuild` uses 0.25.12, matching a version already used by the database toolchain and avoiding [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- `@payloadcms/plugin-cloud-storage@3.91.0 > find-node-modules` is removed. The published plugin lists this dependency in its manifest but none of its distributed JavaScript imports or uses it. Its unused dependency chain pulls the same unpatched Braces package. This removal is scoped to the inspected plugin version; an upgrade must recheck the distributed source and actual S3 integration.

These are targeted dependency updates/removal of an unused package, not replacements of package behavior or advisory suppressions. Recheck each override when updating Payload. Validate installation, migrations/type generation, the production build, and CMS/browser tests before removing or changing them. CI checks production dependencies for high/critical advisories.
