import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { embedHandler } from '../../services/embeds/handler'
import { previewToken } from '@multimedia/cms/lib/snippets/tokens'
import { validateFiles } from '@multimedia/cms/lib/snippets/bundles'

test('embed server protects drafts, serves relative resources, enforces its manifest, ranges and CSP', async () => {
  const file = Buffer.from('<html>hello world</html>')
  const manifest = validateFiles([
    { path: 'index.html', bytes: file },
    { path: 'assets/app.js', bytes: Buffer.from('export default 1') },
  ])
  const server = createServer(
    embedHandler({
      storage: {
        read: async (key) => (key.endsWith('.js') ? Buffer.from('export default 1') : file),
        write: async () => {},
        remove: async () => {},
      },
      lookup: async (id) =>
        ['1', '2'].includes(id)
          ? {
              storage_prefix: 'snippets/test',
              entry_file: 'index.html',
              manifest,
              _status: id === '1' ? 'published' : 'draft',
            }
          : null,
      health: async () => {},
      siteOrigin: 'https://blog.example.test',
    }),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    assert.equal((await fetch(`${base}/bundles/2/index.html`)).status, 404)
    assert.equal((await fetch(`${base}/preview/${previewToken(2)}/2/index.html`)).status, 200)
    const preview = await fetch(`${base}/preview/${previewToken(2)}/2/assets/app.js`)
    assert.equal(preview.headers.get('cache-control'), 'private, no-store')
    const published = await fetch(`${base}/bundles/1/index.html`)
    assert.match(
      published.headers.get('content-security-policy')!,
      /frame-ancestors https:\/\/blog.example.test/,
    )
    assert.match(
      published.headers.get('content-security-policy')!,
      /sandbox allow-scripts allow-same-origin/,
    )
    assert.equal(published.headers.get('x-content-type-options'), 'nosniff')
    assert.equal((await fetch(`${base}/bundles/1/not-in-manifest.js`)).status, 404)
    assert.equal((await fetch(`${base}/admin`)).status, 404)
    assert.equal((await fetch(`${base}/bundles/1/index.html`, { method: 'POST' })).status, 405)
    const range = await fetch(`${base}/bundles/1/index.html`, { headers: { Range: 'bytes=1-4' } })
    assert.equal(range.status, 206)
    assert.equal(await range.text(), file.subarray(1, 5).toString())
    assert.equal(
      (await fetch(`${base}/bundles/1/index.html`, { headers: { Range: 'bytes=999-' } })).status,
      416,
    )
    assert.equal(
      (
        await fetch(`${base}/bundles/1/index.html`, {
          headers: { 'If-None-Match': published.headers.get('etag')! },
        })
      ).status,
      304,
    )
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
