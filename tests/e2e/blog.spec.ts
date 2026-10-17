import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { audioFixture } from '../fixtures/audio'

test('journal, comparison slides, video, interactive modules, deep links and read-all work', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Observe closely/ })).toBeVisible()
  await page
    .getByRole('heading', { name: 'Small targets, bigger decisions' })
    .getByRole('link')
    .click()
  await expect(page.getByRole('heading', { name: 'Start with an observation' })).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  const comparison = page.locator('.slide:not([hidden])')
  await expect(comparison.getByRole('img')).toHaveCount(2)
  await expect(comparison.locator('figcaption')).toHaveCount(2)
  const deepLink = page.url()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Put the evidence side by side' })).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  const video = page.locator('.slide:not([hidden]) video')
  await expect(video).toBeVisible()
  await video.evaluate(async (element) => {
    await (element as HTMLVideoElement).play()
  })
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect
    .poll(() => page.locator('video').evaluate((element) => (element as HTMLVideoElement).paused))
    .toBe(true)
  const frame = page.frameLocator('iframe[title="Interactive target size example"]')
  await expect(frame.getByText('Sample content · module imports', { exact: false })).toBeVisible()
  await frame.getByRole('button', { name: 'First target' }).click()
  await expect(frame.locator('#result')).toContainText('Selected target 1')
  const isolated = await page
    .locator('iframe[title="Interactive target size example"]')
    .evaluate((element) => {
      try {
        return (element as HTMLIFrameElement).contentWindow!.document.body.innerText
      } catch {
        return 'isolated'
      }
    })
  expect(isolated).toBe('isolated')
  await page.getByRole('button', { name: 'Read all' }).click()
  await expect(page.locator('.slide:not([hidden])')).toHaveCount(5)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.goto(deepLink)
  await expect(page.getByRole('heading', { name: 'Put the evidence side by side' })).toBeVisible()
  expect(errors).toEqual([])
})

test('public API, feed, sitemap, topic pages and admin are reachable', async ({
  request,
  page,
}) => {
  expect((await request.get('/api/health')).status()).toBe(200)
  expect((await request.get('/feed.xml')).headers()['content-type']).toContain('rss+xml')
  expect(await (await request.get('/sitemap.xml')).text()).toContain(
    '/posts/small-targets-bigger-decisions',
  )
  expect((await request.post('/api/posts', { data: { title: 'Forbidden' } })).status()).toBe(403)
  expect((await request.get('/editor-guide', { maxRedirects: 0 })).status()).toBe(307)
  await page.goto('/topics/interface-studies')
  await expect(page.getByRole('heading', { name: 'Interface studies', exact: true })).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('an editor uploads through Payload, follows the guide and publishes uploaded evidence with audio', async ({
  page,
}) => {
  expect(
    (
      await page.request.post('/api/users/login', {
        data: {
          email: process.env.HCI_E2E_EDITOR_EMAIL,
          password: process.env.HCI_E2E_EDITOR_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200)
  await page.goto('/admin/collections/media/create')
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'editor-notes.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('observation,value\nkeyboard,true\n'),
    })
  await page.getByRole('textbox', { name: /^Title/ }).fill('Evidence entered in the editor')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(/\/admin\/collections\/media\/\d+/)
  const id = Number(new URL(page.url()).pathname.split('/').at(-1))
  expect(Number.isInteger(id)).toBe(true)
  const mediaResponse = await page.request.get(`/api/media/${id}`, {
    headers: { Origin: 'http://localhost:4500' },
  })
  expect(mediaResponse.status()).toBe(200)
  const media = await mediaResponse.json()
  expect(media.visibility).toBe('private')
  await page.getByRole('button', { name: 'Open Menu', exact: true }).click()
  await page.getByRole('link', { name: 'Editor guide', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add and organize your evidence.' })).toBeVisible()
  await page.getByRole('link', { name: 'import an interactive ZIP', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Import draft bundle' })).toBeVisible()
  const headers = { Origin: 'http://localhost:4500' }
  await page.request.patch(`/api/media/${id}`, { headers, data: { visibility: 'public' } })
  const source = await page.request.post('/api/sources', {
    headers,
    data: { title: 'My uploaded evidence', attachments: [id], _status: 'published' },
  })
  expect(source.status()).toBe(201)
  const sourceID = (await source.json()).doc.id
  const audio = await page.request.post('/api/media', {
    headers,
    multipart: {
      _payload: JSON.stringify({ title: 'Editor audio', visibility: 'public' }),
      file: { name: 'editor-audio.wav', mimeType: 'audio/wav', buffer: audioFixture() },
    },
  })
  expect(audio.status()).toBe(201)
  const audioID = (await audio.json()).doc.id
  const article = await page.request.post('/api/posts', {
    headers,
    data: {
      title: 'Uploaded evidence article',
      slug: 'uploaded-evidence-article',
      summary: 'Entered manually',
      sources: [sourceID],
      _status: 'published',
      slides: [
        {
          title: 'Listen to the evidence',
          layout: 'stacked',
          content: [
            {
              blockType: 'audio',
              media: audioID,
              caption: 'An illustrative audio fixture',
              transcript: 'A short generated tone.',
              source: sourceID,
            },
          ],
        },
        {
          title: 'Original data',
          layout: 'stacked',
          content: [{ blockType: 'download', media: id, label: 'Download the dataset' }],
        },
      ],
    },
  })
  expect(article.status()).toBe(201)
  await page.goto('/posts/uploaded-evidence-article')
  await expect(page.getByText('An illustrative audio fixture')).toBeVisible()
  await page.locator('audio').evaluate(async (element) => {
    await (element as HTMLAudioElement).play()
  })
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect
    .poll(() => page.locator('audio').evaluate((element) => (element as HTMLAudioElement).paused))
    .toBe(true)
  await expect(page.getByRole('link', { name: 'Evidence entered in the editor ↓' })).toBeVisible()
})

test('draft posts require authenticated previews and never appear in public APIs', async ({
  page,
  request,
}) => {
  const login = await page.request.post('/api/users/login', {
    data: { email: process.env.HCI_E2E_EMAIL, password: process.env.HCI_E2E_PASSWORD },
  })
  expect(login.status()).toBe(200)
  const created = await page.request.post('/api/posts', {
    headers: { Origin: 'http://localhost:4500' },
    data: {
      title: 'Private draft title',
      slug: 'private-draft',
      summary: 'Private draft summary',
      _status: 'draft',
      slides: [],
    },
  })
  expect(created.status()).toBe(201)
  const publicResult = await request.get('/api/posts?where[slug][equals]=private-draft')
  expect((await publicResult.json()).totalDocs).toBe(0)
  expect((await request.get('/posts/private-draft')).status()).toBe(404)
  expect((await request.get('/preview?slug=private-draft')).status()).toBe(401)
  await page.goto('/preview?slug=private-draft')
  await expect(page.getByRole('heading', { name: 'Private draft title' })).toBeVisible()
  await expect(page.getByText('Authenticated draft preview')).toBeVisible()
  await page.getByRole('link', { name: 'Exit preview' }).click()
  expect((await page.request.get('/posts/private-draft')).status()).toBe(404)
})

test('CMS ZIP import, authenticated bundle previews, publishing and private media delivery work', async ({
  page,
  request,
}) => {
  expect((await request.post('/api/bundle-import')).status()).toBe(401)
  await page.request.post('/api/users/login', {
    data: { email: process.env.HCI_E2E_EMAIL, password: process.env.HCI_E2E_PASSWORD },
  })
  await page.goto('/bundles/import')
  await page.getByLabel('Title', { exact: true }).fill('A browser-imported bundle')
  await page.getByLabel('ZIP bundle').setInputFiles('tests/fixtures/hello.zip')
  await page.getByRole('button', { name: 'Import draft bundle' }).click()
  await page.waitForURL(/\/admin\/collections\/snippets\/\d+/)
  const id = page.url().split('/').at(-1)!
  expect((await request.get(`http://localhost:4501/bundles/${id}/index.html`)).status()).toBe(404)
  await page.goto(`/snippet-preview?id=${id}`)
  await expect(
    page.frameLocator('iframe').getByRole('heading', { name: 'Imported example' }),
  ).toBeVisible()
  const published = await page.request.patch(`/api/snippets/${id}`, {
    headers: { Origin: 'http://localhost:4500' },
    data: { _status: 'published' },
  })
  expect(published.status()).toBe(200)
  expect((await request.get(`http://localhost:4501/bundles/${id}/index.html`)).status()).toBe(200)
  const featured = await page.request.post('/api/posts', {
    headers: { Origin: 'http://localhost:4500' },
    data: {
      title: 'Featured interaction',
      slug: 'featured-interaction',
      summary: 'An embed with context',
      featuredSnippet: Number(id),
      featuredSnippetCaption: 'A caption underneath the featured experiment.',
      _status: 'published',
    },
  })
  expect(featured.status()).toBe(201)
  await page.goto('/posts/featured-interaction')
  await expect(page.getByText('A caption underneath the featured experiment.')).toBeVisible()
  const uploaded = await page.request.post('/api/media', {
    headers: { Origin: 'http://localhost:4500' },
    multipart: {
      _payload: JSON.stringify({ title: 'Private browser fixture', visibility: 'private' }),
      file: {
        name: 'private-note.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('private text'),
      },
    },
  })
  expect(uploaded.status()).toBe(201)
  const media = (await uploaded.json()).doc
  expect((await request.get(media.url)).status()).not.toBe(200)
  expect(
    (await page.request.get(media.url, { headers: { Origin: 'http://localhost:4500' } })).status(),
  ).toBe(200)
  const video = (await (await request.get('/api/media?where[mimeType][equals]=video/webm')).json())
    .docs[0]
  const response = await request.get(video.url, { headers: { Range: 'bytes=0-99' } })
  expect(response.status()).toBe(206)
  expect((await response.body()).length).toBe(100)
  expect((await readFile('tests/fixtures/hello.zip')).length).toBeGreaterThan(0)
})
