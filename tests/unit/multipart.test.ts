import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bundleFormData } from '../../src/lib/snippets/multipart'

test('bundle multipart parsing bounds bodies even without a Content-Length header', async () => {
  const form = new FormData()
  form.set('title', 'A bundle')
  form.set('file', new File(['zip bytes'], 'example.zip'))
  const parsed = await bundleFormData(
    new Request('http://localhost/import', { method: 'POST', body: form }),
  )
  assert.equal(parsed.get('title'), 'A bundle')
  assert.equal((parsed.get('file') as File).name, 'example.zip')
  let cancelled = false
  await assert.rejects(
    bundleFormData({
      headers: new Headers({ 'Content-Type': 'multipart/form-data; boundary=example' }),
      body: new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(27 * 1024 * 1024))
        },
        cancel() {
          cancelled = true
        },
      }),
    }),
    /25 MiB/,
  )
  assert(cancelled)
})
