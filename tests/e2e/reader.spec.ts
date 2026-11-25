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
  const texture = groups.nth(0)
  const shape = groups.nth(1)
  const next = { name: 'Next slide' }
  const expectSlides = async (textureSlide: string, shapeSlide: string) => {
    await expect(texture.getByRole('heading', { name: `Texture ${textureSlide}` })).toBeVisible()
    await expect(shape.getByRole('heading', { name: `Shape ${shapeSlide}` })).toBeVisible()
  }

  await expectSlides('Overview', 'Overview')
  await texture.getByRole('button', next).click()
  await expectSlides('Detail', 'Overview')
  const deepLink = page.url()
  await shape.getByRole('button', next).click()
  await expectSlides('Detail', 'Detail')
  await texture.getByRole('button', next).click()
  await expectSlides('Comparison', 'Detail')
  await shape.getByRole('button', next).click()
  await expectSlides('Comparison', 'Comparison')
  await page.goBack()
  await expectSlides('Comparison', 'Detail')
  await page.goBack()
  await expectSlides('Detail', 'Detail')
  await page.goBack()
  await expectSlides('Detail', 'Overview')
  await page.goBack()
  await expect(page).toHaveURL('/posts/' + slug)
  await expectSlides('Overview', 'Overview')
  await page.goForward()
  await expectSlides('Detail', 'Overview')
  await page.goForward()
  await expectSlides('Detail', 'Detail')

  // Exercise a history entry to which client routing carried the previous state.
  await page.evaluate(() => window.history.pushState(window.history.state, '', '?reader=other'))
  await page.goBack()
  await expectSlides('Detail', 'Detail')
  await page.goForward()
  await expectSlides('Overview', 'Overview')

  const linkedPage = await page.context().newPage()
  await linkedPage.goto(deepLink)
  await linkedPage.reload()
  await expect(linkedPage.getByRole('heading', { name: 'Texture Detail' })).toBeVisible()
  await expect(linkedPage.getByRole('heading', { name: 'Shape Overview' })).toBeVisible()
})
