import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMultimediaCMS } from '@multimedia/cms'
import { copyList } from '@multimedia/cms/lib/content/revisions'
import type { ContentList } from '@multimedia/cms/types'
import { contentBlocks, blockReferences } from '@multimedia/cms/blocks'

test('the reusable CMS boots a second site configuration without HCI components or a database connection', async () => {
  const config = await createMultimediaCMS({
    directory: process.cwd() + '/src',
    databaseURL: 'postgresql://unused:unused@127.0.0.1:1/not_connected',
    title: 'A different multimedia site',
  })
  assert(config.collections.some((collection) => collection.slug === 'entries'))
  assert(config.collections.some((collection) => collection.slug === 'content-lists'))
  assert(!config.collections.some((collection) => String(collection.slug) === 'posts'))
  assert.deepEqual(config.admin.components?.afterNavLinks, [])
  const settings = config.globals.find((global) => global.slug === 'site-settings')!
  const title = settings.fields.find((field) => 'name' in field && field.name === 'title')!
  assert('defaultValue' in title && title.defaultValue === 'A different multimedia site')
})
test('new block relationship fields are protected without adding a second reference-path registry', () => {
  contentBlocks.push({
    slug: 'futureAttachment',
    fields: [
      { name: 'file', type: 'upload', relationTo: 'media' },
      { name: 'evidence', type: 'relationship', relationTo: 'sources' },
    ],
  })
  try {
    const block = { blockType: 'futureAttachment', file: 42, evidence: 17 }
    assert.deepEqual(blockReferences(block), [
      { collection: 'media', value: 42, mime: undefined },
      { collection: 'sources', value: 17, mime: undefined },
    ])
  } finally {
    contentBlocks.pop()
  }
})

test('content copies remove Payload row identities without changing identifiers inside rich text', () => {
  const body = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '' as const,
      indent: 0,
      children: [{ type: 'paragraph', version: 1, id: 'research-anchor', children: [] }],
    },
  }
  const source: ContentList = {
    id: 1,
    key: 'list-key',
    presentation: 'flow',
    createdAt: '',
    updatedAt: '',
    items: [
      {
        id: 'old-item-row',
        key: 'item-key',
        layout: 'stacked',
        content: [{ id: 'old-block-row', blockType: 'richText', body }],
      },
    ],
  }
  const revision = copyList(source)
  assert.equal(revision.items?.[0].id, undefined)
  assert.equal(revision.items?.[0].key, 'item-key')
  assert.equal(revision.items?.[0].content?.[0].id, undefined)
  assert.deepEqual(revision.items?.[0].content?.[0], { blockType: 'richText', body })
})
