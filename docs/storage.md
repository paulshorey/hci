# Storage and executable bundles

## Supported storage

Development defaults to ignored `storage/`. Deployed uploads and bundles use a private Railway Bucket with `STORAGE_DRIVER=s3`; application containers are ephemeral. The Railway graph connects each service to its environment's bucket through native credential references. For local access, use the bucket's Credentials values: the exact S3 bucket name, base endpoint, signing region, access key and secret. The signing region is distinct from the immutable placement region selected at creation. New Railway buckets use virtual-hosted URLs with `S3_FORCE_PATH_STYLE=false`; check the Credentials tab for older buckets that require path style. The S3 interface also remains compatible with other providers. See [storage selection and setup](storage-options.md).

The Payload S3 plugin handles normal media and retains its authorized delivery routes. Public requests redirect to five-minute signed bucket URLs by default; editor previews remain proxied. Set `S3_SIGNED_DOWNLOADS=false` to proxy everything. Bundles use the S3 adapter in `src/lib/storage`. Keep the bucket private. Railway Buckets do not directly host websites; the embed service serves bundle objects under a stable relative URL structure.

S3 adapters are tested with signed AWS SDK requests to a local HTTP fixture. Live credentials, network behavior, IAM policies, and provider-specific range/CORS behavior must be verified against the selected deployment before release.

## Import limits

- ZIP: 25 MiB compressed.
- Bundle: 100 MiB expanded, 500 files, 20 MiB per file.
- Paths: relative paths up to 240 characters (Unicode letters/numbers, spaces, dots, underscores and hyphens), without hidden components, symlinks, traversal, ambiguous separators, or case collisions.
- Entry: an existing `.html` file.
- Types: HTML, CSS, JS/MJS, JSON, PNG/JPEG/WebP/AVIF/GIF/SVG, WOFF/WOFF2, MP4/WebM, and plain text.
- Ordinary Payload uploads: 100 MiB by default, configurable with `MEDIA_MAX_UPLOAD_MB` from 1–500. Whole-request limits match the per-file limit plus multipart overhead; oversized uploads reject rather than truncate. Photos, MP4/WebM, MOV originals, MP3/M4A/AAC/OGG/WAV/FLAC audio, PDFs, text, Markdown, CSV, JSON, DOCX/XLSX/PPTX and ZIPs are accepted. Browser codec support varies. Convert MOV originals for playback; they remain valid download evidence. Executable HTML/JS/SVG uploads belong in interactive bundles.

Compress a single folder containing index.html, or create a ZIP with the entry file at its root. The importer removes one unambiguous wrapper folder when using the default entry and ignores .DS_Store / __MACOSX metadata. Otherwise set the entry path explicitly. For example, from inside a bundle folder:

```sh
zip -r ../experiment.zip index.html styles.css main.js assets
```

## Sandbox contract

The blog and embeds must have different origins. Use host-only application auth cookies. In production, use distinct hostnames; local development uses distinct ports. The embed origin must never serve CMS/admin routes or receive authentication tokens.

Bundle responses include CSP sandbox restrictions and the parent iframe uses `allow-scripts allow-same-origin`. Same-origin permission is needed for relative module imports/fetches within the isolated bundle origin; that origin is different from the blog. CSP blocks external network access by default, along with forms, base-tag overrides, camera/microphone and navigation permissions. Inline JS/CSS is allowed inside this isolated origin to support ordinary self-contained demos.

Use local relative paths and package browser-ready dependencies into the bundle. A demo requiring external APIs or third-party frames needs a reviewed extension to this policy; do not relax the main application's security policy or give the snippet CMS credentials.

Public bundle URLs are `/bundles/<id>/<path>`. Draft preview URLs are `/preview/<capability>/<id>/<path>`. Capabilities expire after 15 minutes and authorize one bundle; they do not grant CMS API access. Every request rechecks publication/token access before serving even a cached object. Public responses require revalidation, so unpublishing takes effect on the next request. Preview responses are never publicly cached.

The server only serves manifest-listed files and sets MIME types, nosniff, permissions policy, ETags, and byte-range support. It supports no uploads or code execution on the server. Keep old bundle objects while posts/history reference them. No automatic destructive garbage collection is enabled.
