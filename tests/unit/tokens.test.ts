import assert from 'node:assert/strict'
import { test } from 'node:test'
import { previewToken, validPreviewToken } from '@multimedia/cms/lib/snippets/tokens'
import { externalVideo } from '@multimedia/cms/lib/content/publication'

test('preview capabilities are bound to a bundle and expire after fifteen minutes', () => {
  const now = 1800000000000
  const token = previewToken(12, now)
  assert(validPreviewToken(token, '12', now + 1000))
  assert(!validPreviewToken(token, '13', now + 1000))
  assert(!validPreviewToken(token, '12', now + 900000))
  assert(!validPreviewToken(`${token}x`, '12', now + 1000))
  assert(!validPreviewToken(`${token}.extra`, '12', now + 1000))
})

test('external videos accept known providers or HTTPS video files', () => {
  assert.equal(
    externalVideo('https://youtu.be/abcdefghijk')?.url,
    'https://www.youtube-nocookie.com/embed/abcdefghijk',
  )
  assert.equal(externalVideo('https://vimeo.com/12345')?.kind, 'iframe')
  assert.equal(externalVideo('https://example.com/movie.mp4?version=2')?.kind, 'file')
  for (const url of [
    'javascript:alert(1)',
    'http://example.com/movie.mp4',
    'https://youtube.com.attacker.test/watch?v=abcdefghijk',
    'https://example.com/page',
  ])
    assert.equal(externalVideo(url), null)
})
