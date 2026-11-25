import { expect, test } from '@playwright/test'

test('two evidence carousels retain their positions during links and browser navigation', async ({
  page,
  request,
  browserName,
}) => {
  const signedIn = await request.post('/api/users/login', {
    data: {
      email: process.env.HCI_E2E_EDITOR_EMAIL,
      password: process.env.HCI_E2E_EDITOR_PASSWORD,
    },
  })
  expect(signedIn.ok()).toBeTruthy()
  const lists = []
  for (const title of ['Texture', 'Shape']) {
    const response = await request.post('/api/content-lists', {
      data: {
        title,
        presentation: 'carousel',
        items: ['Overview', 'Detail', 'Comparison'].map((label) => ({
          title: `${title} ${label}`,
        })),
      },
    })
    expect(response.status()).toBe(201)
    lists.push((await response.json()).doc.id)
  }
  const slug = 'two-carousels-' + browserName
  const entry = await request.post('/api/entries', {
    data: { title: 'Two evidence collections', slug, contentLists: lists, _status: 'published' },
  })
  expect(entry.status()).toBe(201)
  await page.goto('/posts/' + slug)
  const groups = page.getByRole('region', { name: 'Multimedia slideshow' })
  const a = groups.nth(0),
    b = groups.nth(1)
  const next = { name: 'Next slide' }
  await a.getByRole('button', next).click()
  await expect(a.getByRole('heading', { name: 'Texture Detail' })).toBeVisible()
  const deepLink = page.url()
  await b.getByRole('button', next).click()
  await expect(b.getByRole('heading', { name: 'Shape Detail' })).toBeVisible()
  await expect(a.getByRole('heading', { name: 'Texture Detail' })).toBeVisible()
  await a.getByRole('button', next).click()
  await b.getByRole('button', next).click()
  await page.goBack()
  await expect(a.getByRole('heading', { name: 'Texture Comparison' })).toBeVisible()
  await page.goBack()
  await expect(b.getByRole('heading', { name: 'Shape Detail' })).toBeVisible()
  await page.goto(deepLink)
  await page.reload()
  await expect(a.getByRole('heading', { name: 'Texture Detail' })).toBeVisible()
})
