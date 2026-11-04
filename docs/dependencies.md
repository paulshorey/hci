# Dependency pins and overrides

The lockfile pins Payload and its official packages together at 3.91.0, Next.js at 16.4.2, and compatible React/TypeScript tooling. Node 24 is the supported application and CI runtime.

Scoped overrides in `pnpm-workspace.yaml` remove advisories inherited from the pinned upstream dependency graph:

- `@payloadcms/next > sass` uses 1.105.2. Payload pins Sass 1.77.4, which pulls the old Chokidar/Braces chain. Current Sass avoids that chain and its unpatched stack-exhaustion advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- `monaco-editor > dompurify` uses 3.4.17 to include the patches for [GHSA-p98j-92pf-mc4p](https://github.com/advisories/GHSA-p98j-92pf-mc4p) and [GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2).
- `@esbuild-kit/core-utils > esbuild` uses 0.25.12, matching a version already used by the database toolchain and avoiding [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- `@payloadcms/plugin-cloud-storage@3.91.0 > find-node-modules` is removed. The published plugin lists this dependency in its manifest but none of its distributed JavaScript imports or uses it. Its unused dependency chain pulls the same unpatched Braces package. This removal is scoped to the inspected plugin version; an upgrade must recheck the distributed source and actual S3 integration.

The CMS workspace also pins `@lexical/headless > happy-dom` to 21.0.4 for [GHSA-834v-8h66-3h79](https://github.com/advisories/GHSA-834v-8h66-3h79), and Undici 7.x to 7.30.1 for [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c). Happy DOM's patched release crosses a major version; the supported Node 24 runtime and the actual Payload/Lexical editor/browser tests are required compatibility checks. DOMPurify 3.4.17 also addresses [GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7).

Nodemailer is pinned to 10.1.4 for its address-parser fixes, including [GHSA-m943-m63m-w62w](https://github.com/advisories/GHSA-m943-m63m-w62w). Fast URI 3.x is pinned to 3.1.9 for [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) and related URI-normalization fixes.

These are targeted dependency updates/removal of an unused package, not replacements of package behavior or advisory suppressions. Recheck each override when updating Payload. Validate installation, migrations/type generation, the production build, and CMS/browser tests before removing or changing them. CI checks production dependencies for high/critical advisories.
