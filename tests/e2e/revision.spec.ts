import { expect, test } from '@playwright/test'

test('an editor can replace an image, reorder supplemental lists and restore the published version', async ({
  page,
  request,
}) => {
  const editor = page.request
  const login = await editor.post('/api/users/login', {
    data: {
      email: process.env.HCI_E2E_EDITOR_EMAIL,
      password: process.env.HCI_E2E_EDITOR_PASSWORD,
    },
  })
  expect(login.ok()).toBeTruthy()
  const images = await (
    await editor.get('/api/media?where[filename][like]=sample-workspace-&sort=filename')
  ).json()
  const [original, replacement] = images.docs
  const originalBytes = await (await request.get(original.url)).body()
  const source = (
    await (await editor.get('/api/sources?where[_status][equals]=published&limit=1')).json()
  ).docs[0]
  const caption = 'The first workspace in the original evidence order.'
  const updated = 'A second workspace chosen for the draft comparison.'
  const lists: number[] = []
  for (const [title, items] of [
    ['Introduction', []],
    [
      'Workspace evidence',
      [
        {
          title: 'First observation',
          content: [
            {
              blockType: 'image',
              media: original.id,
              caption,
              alt: 'Workspace before revision',
              source: source.id,
            },
          ],
        },
      ],
    ],
    ['Discussion prompts', [{ title: 'How would the order change the reading?' }]],
  ] as const) {
    const list = await editor.post('/api/content-lists', {
      data: { title, presentation: 'flow', items },
    })
    expect(list.status()).toBe(201)
    lists.push((await list.json()).doc.id)
  }
  const created = await editor.post('/api/entries', {
    data: {
      title: 'Evidence revision',
      slug: 'evidence-revision',
      _status: 'published',
      contentLists: lists,
      sources: [source.id],
    },
  })
  expect(created.status()).toBe(201)
  const { id } = (await created.json()).doc
  const versions = await (
    await editor.get('/api/entries/versions?where[parent][equals]=' + id + '&limit=1')
  ).json()
  const version = versions.docs[0].id
  const entryUrl = '/api/entries/' + id
  const publicEntry = async () => (await request.get(entryUrl + '?depth=1')).json()
  await page.goto('/admin/collections/entries/' + id)
  await page
    .getByRole('group', { name: 'Discussion prompts' })
    .getByRole('button', { name: 'Move up' })
    .click()
  await page
    .getByRole('group', { name: 'Workspace evidence' })
    .getByRole('button', { name: 'Edit content' })
    .click()
  const drawer = page.locator('.doc-drawer').last()
  const firstBlock = drawer.locator('#field-items__0__content .collapsible__content').first()
  // Payload mounts nested controls when the scrolled drawer brings them into view.
  await firstBlock.scrollIntoViewIfNeeded()
  const media = firstBlock.locator('#field-items__0__content__0__media')
  await expect(media.getByRole('link', { name: original.filename })).toBeVisible()
  await media.locator('.upload-relationship-details__remove').click()
  await media.getByRole('button', { name: /choose from existing/i }).click()
  await page.getByRole('button', { name: replacement.title, exact: true }).click()
  await expect(media.getByRole('link', { name: replacement.filename })).toBeVisible()
  await firstBlock.getByRole('textbox', { name: 'Caption' }).fill(updated)
  await drawer.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(drawer).toBeHidden()
  await expect
    .poll(async () => {
      const draft = await (await editor.get(entryUrl + '?draft=true&depth=0')).json()
      return draft.contentLists[1] === lists[2] && draft.contentLists[2] !== lists[1]
    })
    .toBe(true)
  expect((await publicEntry()).contentLists[1].items[0].content[0].caption).toBe(caption)
  const preview = await page.context().newPage()
  await preview.goto('/preview?slug=evidence-revision')
  await expect(preview.getByText(updated, { exact: true })).toBeVisible()
  await preview.close()
  await page.getByRole('button', { name: 'Publish changes', exact: true }).click()
  await expect
    .poll(async () => (await publicEntry()).contentLists[2].items[0].content[0]?.caption)
    .toBe(updated)
  await page.goto('/admin/collections/entries/' + id + '/versions/' + version)
  await page.getByRole('button', { name: 'Restore this version' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
  await expect
    .poll(async () => (await publicEntry()).contentLists.map((list: { id: number }) => list.id))
    .toEqual(lists)
  const restored = await publicEntry()
  expect(restored.contentLists[1].items[0].content[0]).toMatchObject({
    media: original.id,
    source: source.id,
    caption,
  })
  expect(await (await request.get(original.url)).body()).toEqual(originalBytes)
})
