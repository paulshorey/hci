import { expect, test, type Page, type Request } from '@playwright/test'

async function login(page: Page, role: 'admin' | 'editor' = 'admin') {
  const email = role === 'editor' ? process.env.HCI_E2E_EDITOR_EMAIL! : process.env.HCI_E2E_EMAIL!
  const password =
    role === 'editor' ? process.env.HCI_E2E_EDITOR_PASSWORD! : process.env.HCI_E2E_PASSWORD!
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).not.toHaveURL(/\/login/)
  await page.request.get('/api/users/me').then(async (response) => {
    expect((await response.json()).user?.email).toBe(email)
  })
}
const entryData = (slug: string) => ({
  title: 'An empty primary entry',
  slug,
  _status: 'published',
})

test('HCI renders a primary list and multiple supplemental lists with mixed media', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('heading', { name: 'Small targets, bigger decisions', exact: true })
    .getByRole('link')
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Small targets, bigger decisions',
  )
  await expect(page.getByRole('region', { name: 'Primary content' })).toBeVisible()
  await expect(
    page.getByText('Good research starts with noticing.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Start with an observation')).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect(page.getByRole('heading', { name: 'Put the evidence side by side' })).toBeVisible()
  await expect(page.locator('.slideshow article:not([hidden]) img')).toHaveCount(2)
  await page.getByRole('button', { name: 'Next slide' }).click()
  await expect(page.locator('.slideshow article:not([hidden]) video')).toBeVisible()
  await page.getByRole('button', { name: 'Next slide' }).click()
  const frame = page.frameLocator('iframe[title="Interactive target size example"]')
  await expect(frame.locator('body')).toContainText('target')
  await page.getByRole('button', { name: 'Read all' }).click()
  await expect(page.getByRole('heading', { name: 'Further reading' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Evidence note ↓', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Try the interaction' })).toBeVisible()
})

test('public APIs enforce draft privacy, list privacy, access and feed contracts', async ({
  request,
}) => {
  expect((await request.post('/api/entries', { data: entryData('forbidden') })).status()).toBe(403)
  const entries = await (await request.get('/api/entries?depth=1')).json()
  expect(entries.totalDocs).toBe(3)
  expect(entries.docs[0]).not.toHaveProperty('featuredImage')
  expect((await request.get('/editor-guide', { maxRedirects: 0 })).status()).toBe(307)
  const rss = await request.get('/feed.xml')
  expect(rss.status()).toBe(200)
  expect(await rss.text()).toContain('Small targets, bigger decisions')
  expect((await request.get('/sitemap.xml')).status()).toBe(200)
  expect((await request.get('/api/health')).status()).toBe(200)
})

test('required primary content can be empty and supplemental relations are optional', async ({
  page,
  request,
}) => {
  await login(page)
  const response = await page.request.post('/api/entries', { data: entryData('empty-primary') })
  expect(response.status()).toBe(201)
  const entry = (await response.json()).doc
  expect(entry.contentLists).toHaveLength(1)
  const id =
    typeof entry.contentLists[0] === 'object' ? entry.contentLists[0].id : entry.contentLists[0]
  const content = await (await request.get(`/api/content-lists/${id}`)).json()
  expect(content.items).toEqual([])
  const remove = await page.request.patch(`/api/entries/${entry.id}?draft=true`, {
    data: { contentLists: [] },
  })
  expect(remove.status()).toBe(400)
  await page.goto('/posts/empty-primary')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('An empty primary entry')
})

test('the editor shows primary content as standard and adds optional lists through a content drawer', async ({
  page,
}) => {
  await login(page, 'editor')
  const response = await page.request.post('/api/entries?draft=true', {
    data: { title: 'Editor workflow', slug: `editor-workflow-${Date.now()}` },
  })
  expect(response.status()).toBe(201)
  const entry = (await response.json()).doc
  await page.goto(`/admin/collections/entries/${entry.id}`)
  await expect(page.getByText('Primary content', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove list' })).toHaveCount(0)
  await page.screenshot({ path: '.local/cms-editor.png', fullPage: true })
  await page
    .getByRole('group', { name: 'Primary content', exact: true })
    .getByRole('button', { name: 'Edit content', exact: true })
    .click()
  const drawer = page.locator('.doc-drawer').last()
  await expect(drawer).toBeVisible()
  await expect(drawer.locator('form')).toHaveAttribute('data-form-ready', 'true')
  // Reproduce a slow title-validation request arriving after a row is added.
  const formStateWith = (text: string) => (request: Request) =>
    request.method() === 'POST' &&
    Boolean(request.postData()?.includes('"name":"form-state"')) &&
    Boolean(request.postData()?.includes(text))
  const titleChange = formStateWith('"value":"Primary revision"')
  let releaseTitle!: () => void
  const titleRelease = new Promise<void>((resolve) => (releaseTitle = resolve))
  await page.route(`**/admin/collections/entries/${entry.id}`, async (route) => {
    if (titleChange(route.request())) await titleRelease
    await route.continue()
  })
  const titleRequest = page.waitForRequest(titleChange)
  await drawer.locator('input[name="title"]').fill('Primary revision')
  await titleRequest
  try {
    await drawer.getByRole('button', { name: 'Add Item', exact: true }).click()
  } finally {
    releaseTitle()
  }
  await drawer.getByRole('button', { name: 'Add Content block', exact: true }).click()
  await page.getByText('Rich Text', { exact: true }).click()
  // Rich text reaches form state after a debounce; saving earlier submits an empty body.
  const bodyState = page.waitForResponse((response) =>
    formStateWith('Primary text written in the editor.')(response.request()),
  )
  await drawer.locator('[contenteditable="true"]').fill('Primary text written in the editor.')
  await bodyState
  await drawer.getByRole('button', { name: 'Add Content block', exact: true }).click()
  await page.getByText('Link', { exact: true }).last().click()
  await drawer
    .locator('input[name="items.0.content.1.url"]')
    .fill('https://example.org/observations')
  await drawer.locator('input[name="items.0.content.1.label"]').fill('Observation notes')
  await drawer.getByRole('button', { name: 'Add Item', exact: true }).click()
  await drawer.locator('input[name="items.1.title"]').fill('Follow-up observation')
  const nextItemBlocks = drawer.locator('#field-items__1__content')
  await nextItemBlocks.getByRole('button', { name: 'Add Content block', exact: true }).click()
  await page.getByText('Rich Text', { exact: true }).last().click()
  const followUpState = page.waitForResponse((response) =>
    formStateWith('Repeat the observation with a larger target.')(response.request()),
  )
  await nextItemBlocks
    .locator('[contenteditable="true"]')
    .fill('Repeat the observation with a larger target.')
  await followUpState
  await drawer.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(drawer).not.toBeVisible()
  await page.getByRole('button', { name: 'Add another content list', exact: true }).click()
  const extra = page.locator('.doc-drawer').last()
  await expect(extra).toBeVisible()
  await extra.locator('input[name="title"]').fill('Optional evidence')
  await extra.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(extra).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Additional content lists' })).toBeVisible()
  await expect(page.getByText('Optional evidence', { exact: true })).toBeVisible()
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/entries/${entry.id}?draft=true&depth=0`)
      return (await r.json()).contentLists?.length
    })
    .toBe(2)
  const saved = await (await page.request.get(`/api/entries/${entry.id}?draft=true&depth=1`)).json()
  expect(saved.contentLists[0].items[0].content[0].body.root.children[0].children[0].text).toBe(
    'Primary text written in the editor.',
  )
  const [observation, followUp] = saved.contentLists[0].items
  expect(saved.contentLists[0].items).toHaveLength(2)
  expect(observation.content).toHaveLength(2)
  expect(observation.content[1]).toMatchObject({
    blockType: 'link',
    label: 'Observation notes',
    url: 'https://example.org/observations',
  })
  expect(followUp.title).toBe('Follow-up observation')
  expect(followUp.content[0].body.root.children[0].children[0].text).toBe(
    'Repeat the observation with a larger target.',
  )
  await page.screenshot({ path: '.local/cms-editor-complete.png', fullPage: true })
})

test('new content revisions stay private until the entry is published', async ({
  page,
  request,
}) => {
  await login(page)
  const created = await page.request.post('/api/entries', { data: entryData('revision-privacy') })
  const entry = (await created.json()).doc
  const oldId =
    typeof entry.contentLists[0] === 'object' ? entry.contentLists[0].id : entry.contentLists[0]
  const revision = await page.request.post(`/api/content-lists/${oldId}/revise`)
  expect(revision.status()).toBe(201)
  const next = await revision.json()
  await page.request.patch(`/api/content-lists/${next.id}`, {
    data: { title: 'Private next revision' },
  })
  expect(
    (
      await page.request.patch(`/api/entries/${entry.id}?draft=true`, {
        data: { contentLists: [next.id], _status: 'draft' },
      })
    ).status(),
  ).toBe(200)
  expect((await request.get(`/api/content-lists/${next.id}`)).status()).toBe(404)
  const publicEntry = await (await request.get(`/api/entries/${entry.id}?depth=0`)).json()
  expect(publicEntry.contentLists).toEqual([oldId])
})

test('an editor can create and publish an empty-primary entry entirely through the admin UI', async ({
  page,
  request,
}) => {
  await login(page, 'editor')
  await page.goto('/admin/collections/entries/create')
  await expect(page.getByText('Primary content', { exact: true })).toBeVisible()
  await page.locator('input[name="title"]').fill('Created in the admin')
  await page.locator('input[name="slug"]').fill('created-in-admin')
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect
    .poll(async () => {
      const response = await request.get(
        '/api/entries?where[slug][equals]=created-in-admin&depth=1',
      )
      const result = await response.json()
      return result.docs?.[0]?.contentLists?.[0]?.items
    })
    .toEqual([])
  await page.goto('/posts/created-in-admin')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Created in the admin')
})

test('administrators can inspect scheduled jobs while editors cannot read job data', async ({
  page,
}) => {
  await login(page, 'editor')
  expect((await page.request.get('/api/payload-jobs')).status()).toBe(403)
  await page.context().clearCookies()
  await login(page)
  expect((await page.request.get('/api/payload-jobs')).status()).toBe(200)
  await page.goto('/admin/collections/payload-jobs')
  await expect(page.getByRole('heading', { level: 1, name: 'Jobs' })).toBeVisible()
})
