import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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
  await page.goto('/topics/interface-studies')
  await expect(page.getByRole('heading', { name: 'Interface studies', exact: true })).toBeVisible()
  await page.goto('/admin')
  await expect(page.getByLabel('Email')).toBeVisible()
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
