import 'dotenv/config'
import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { Client } from 'pg'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { ContentList, Media, User } from '@multimedia/cms/types'
import { newListData } from '@multimedia/cms/lib/content/new-list'
import { copyList } from '@multimedia/cms/lib/content/lists'
import { entrySummaries, entryBySlug } from '@multimedia/cms/lib/content/queries'
import { importBundle } from '@multimedia/cms/lib/snippets/bundles'

let payload: Payload, control: Client, name: string, directory: string, owner: User
let image: Media, source: number, snippet: number
const rich = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '' as const,
        indent: 0,
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})
let counter = 0
const entry = (ids?: number[], status: 'draft' | 'published' = 'draft') =>
  payload.create({
    collection: 'entries',
    user: owner,
    depth: 0,
    data: {
      visibility: 'public',
      title: 'A generic entry',
      slug: `entry-${++counter}`,
      kind: 'portfolio',
      contentLists: ids as number[],
      _status: status,
    },
  })
const list = (value: Parameters<typeof newListData>[0] = {}) =>
  payload.create({ collection: 'content-lists', user: owner, depth: 0, data: newListData(value) })
const photo = async (visibility: 'private' | 'public' = 'public') => {
  const bytes = await sharp({
    create: { width: 12, height: 12, channels: 3, background: '#435d4b' },
  })
    .png()
    .toBuffer()
  return payload.create({
    collection: 'media',
    user: owner,
    data: { title: 'Evidence', visibility },
    file: {
      data: bytes,
      size: bytes.length,
      name: `evidence-${++counter}.png`,
      mimetype: 'image/png',
    },
  })
}
before(
  async () => {
    const url = new URL(process.env.HCI_TEST_DATABASE_URL || '')
    if (
      !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Disposable local database required')
    control = new Client({ connectionString: url.href })
    await control.connect()
    name = `cms_integration_${randomBytes(5).toString('hex')}_test`
    await control.query(`CREATE DATABASE "${name}"`)
    url.pathname = `/${name}`
    directory = await mkdtemp(path.join(tmpdir(), 'cms-integration-'))
    process.env.DB_HCI_URL = url.href
    process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/wrong_project'
    process.env.STORAGE_DIR = directory
    process.env.CMS_RUN_JOBS = 'false'
    execFileSync('pnpm', ['db:migrate'], { env: process.env, stdio: 'pipe' })
    const { getPayload } = await import('payload')
    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })
    owner = await payload.create({
      collection: 'users',
      data: {
        name: 'Owner',
        role: 'admin',
        email: 'owner@example.test',
        password: randomBytes(24).toString('hex'),
      },
    })
    image = await photo()
    source = (
      await payload.create({
        collection: 'sources',
        data: {
          title: 'Reference',
          url: 'https://example.com/evidence',
          notes: 'Private research notes',
          accessedAt: new Date().toISOString(),
          _status: 'published',
        },
      })
    ).id
    const bundle = await importBundle({
      payload,
      user: owner,
      title: 'Experiment',
      files: [{ path: 'index.html', bytes: Buffer.from('<html><body>Experiment</body></html>') }],
    })
    snippet = (
      await payload.update({
        collection: 'snippets',
        id: bundle.id,
        data: { _status: 'published' },
      })
    ).id
  },
  { timeout: 90000 },
)
after(async () => {
  if (payload) {
    payload.db.pool.on('error', () => {})
    void payload.db.pool.end()
  }
  await payload?.destroy()
  if (control) {
    await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await control.end()
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})

test('entries automatically receive a required, empty primary list and have no media columns', async () => {
  const doc = await entry()
  assert.equal(doc.contentLists.length, 1)
  const content = await payload.findByID({
    collection: 'content-lists',
    id: Number(doc.contentLists[0]),
    depth: 0,
  })
  assert.equal(content.sealed, true)
  assert.deepEqual(content.items, [])
  assert.equal(content.public, false)
  const cols = await payload.db.pool.query(
    'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
    ['entries'],
  )
  assert(
    !cols.rows.some((row) => row.column_name.startsWith('featured_') || row.column_name === 'body'),
  )
})
test('the primary relation cannot be removed or duplicated, including in a draft', async () => {
  const doc = await entry()
  await assert.rejects(
    payload.update({ collection: 'entries', id: doc.id, draft: true, data: { contentLists: [] } }),
    /primary/,
  )
  await assert.rejects(
    payload.update({
      collection: 'entries',
      id: doc.id,
      data: { contentLists: [Number(doc.contentLists[0]), Number(doc.contentLists[0])] },
    }),
    /repeated/,
  )
})
test('empty lists and empty items can publish without requiring any media type', async () => {
  const primary = await list({ items: [{ layout: 'stacked', content: [] }] })
  const optional = await list()
  const doc = await entry([primary.id, optional.id], 'published')
  const read = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    overrideAccess: false,
    depth: 2,
  })
  assert.equal(read.contentLists.length, 2)
})
test('every list supports repeated and mixed typed media, captions, and missing types', async () => {
  const primary = await list({
    items: [
      {
        layout: 'comparison',
        content: [
          { blockType: 'image', media: image.id, alt: 'First', caption: 'First caption', source },
          { blockType: 'image', media: image.id, alt: 'Second', caption: 'Second caption' },
        ],
      },
    ],
  })
  const additional = await list({
    presentation: 'carousel',
    items: [
      {
        title: 'Text only',
        layout: 'stacked',
        content: [{ blockType: 'richText', body: rich('Text without media') }],
      },
      {
        title: 'Interactive and links',
        layout: 'stacked',
        content: [
          {
            blockType: 'embed',
            snippet,
            title: 'Experiment',
            height: 400,
            caption: 'Interactive caption',
          },
          { blockType: 'link', url: 'https://example.com', label: 'Reference' },
          { blockType: 'download', media: image.id, label: 'Original evidence' },
        ],
      },
    ],
  })
  const doc = await entry([primary.id, additional.id], 'published')
  const read = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    overrideAccess: false,
    depth: 2,
  })
  const first = read.contentLists[0] as ContentList
  assert.equal(first.items?.[0].content?.length, 2)
  assert.equal(first.items?.[0].content?.[0].blockType, 'image')
  assert.equal((read.contentLists[1] as ContentList).items?.[0].content?.[0].blockType, 'richText')
})
test('saved lists are immutable and cannot be deleted even by privileged callers', async () => {
  const doc = await entry()
  const id = Number(doc.contentLists[0])
  await assert.rejects(
    payload.update({ collection: 'content-lists', id, data: { title: 'Mutated' } }),
    /immutable/,
  )
  await assert.rejects(payload.delete({ collection: 'content-lists', id }), /history/)
})
test('copying content creates SQL identities while preserving stable keys and captions', async () => {
  const original = await list({
    items: [
      {
        title: 'Evidence',
        layout: 'stacked',
        content: [
          { blockType: 'image', media: image.id, alt: 'Image', caption: 'Context', source },
        ],
      },
    ],
  })
  await entry([original.id])
  const next = await payload.create({ collection: 'content-lists', data: copyList(original) })
  assert.notEqual(next.items?.[0].id, original.items?.[0].id)
  assert.equal(next.key, original.key)
  assert.equal(next.items?.[0].key, original.items?.[0].key)
  assert.equal(next.items?.[0].content?.[0].blockType, 'image')
})
test('newer drafts cannot change published list content or expose the new revision', async () => {
  const original = await list({
    items: [
      {
        title: 'Published item',
        layout: 'stacked',
        content: [{ blockType: 'richText', body: rich('Published text') }],
      },
    ],
  })
  const doc = await entry([original.id], 'published')
  const revision = await payload.create({
    collection: 'content-lists',
    data: { ...copyList(original), title: 'Draft list' },
  })
  await payload.update({
    collection: 'entries',
    id: doc.id,
    draft: true,
    data: { contentLists: [revision.id], title: 'Draft title', _status: 'draft' },
  })
  const publicDoc = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    overrideAccess: false,
    depth: 0,
  })
  assert.equal(publicDoc.title, 'A generic entry')
  assert.deepEqual(publicDoc.contentLists, [original.id])
  await assert.rejects(
    payload.findByID({ collection: 'content-lists', id: revision.id, overrideAccess: false }),
  )
  const draft = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    draft: true,
    user: owner,
    overrideAccess: false,
    depth: 0,
  })
  assert.deepEqual(draft.contentLists, [revision.id])
})
test('publishing a new revision and restoring entry history restores its entire content graph', async () => {
  const original = await list({ title: 'Original list' })
  const doc = await entry([original.id], 'published')
  const versions = await payload.findVersions({
    collection: 'entries',
    where: { parent: { equals: doc.id } },
    sort: '-createdAt',
    limit: 1,
  })
  const next = await payload.create({
    collection: 'content-lists',
    data: { ...copyList(original), title: 'Replacement list' },
  })
  await payload.update({ collection: 'entries', id: doc.id, data: { contentLists: [next.id] } })
  assert.equal(
    (await payload.findByID({ collection: 'content-lists', id: original.id })).public,
    false,
  )
  assert.equal((await payload.findByID({ collection: 'content-lists', id: next.id })).public, true)
  await payload.restoreVersion({ collection: 'entries', id: versions.docs[0].id, user: owner })
  const restored = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    overrideAccess: false,
    depth: 1,
  })
  assert.equal((restored.contentLists[0] as ContentList).title, 'Original list')
  assert.equal((await payload.findByID({ collection: 'content-lists', id: next.id })).public, false)
})
test('two revisions of the same logical list cannot collide inside one entry', async () => {
  const original = await list()
  const next = await payload.create({ collection: 'content-lists', data: copyList(original) })
  await assert.rejects(entry([original.id, next.id]), /two revisions/)
})
test('additional list ordering preserves relations and their media', async () => {
  const primary = await list(),
    a = await list({ title: 'A' }),
    b = await list({ title: 'B' })
  const doc = await entry([primary.id, a.id, b.id], 'published')
  await payload.update({
    collection: 'entries',
    id: doc.id,
    data: { contentLists: [primary.id, b.id, a.id] },
  })
  assert.deepEqual(
    (await payload.findByID({ collection: 'entries', id: doc.id, depth: 0 })).contentLists,
    [primary.id, b.id, a.id],
  )
})
test('anonymous callers cannot write, read drafts, see accounts, or mark lists public', async () => {
  const doc = await entry()
  await assert.rejects(
    payload.findByID({ collection: 'entries', id: doc.id, overrideAccess: false }),
  )
  await assert.rejects(
    payload.create({
      collection: 'entries',
      overrideAccess: false,
      draft: true,
      data: { title: 'Forbidden', slug: 'forbidden' },
    }),
  )
  await assert.rejects(
    payload.update({
      collection: 'content-lists',
      id: Number(doc.contentLists[0]),
      overrideAccess: false,
      user: owner,
      data: { public: true },
    }),
    /controlled|immutable/,
  )
  assert.equal((await payload.find({ collection: 'users', overrideAccess: false })).totalDocs, 0)
})
test('publication requires accessible media, image alt text, and captions in every list', async () => {
  const privateImage = await photo('private')
  const missingCaption = await list({
    items: [
      { layout: 'stacked', content: [{ blockType: 'image', media: image.id, alt: 'Image' }] },
    ],
  })
  await assert.rejects(entry([missingCaption.id], 'published'), /caption/)
  const inaccessible = await list({
    items: [
      {
        layout: 'stacked',
        content: [{ blockType: 'image', media: privateImage.id, alt: 'Image', caption: 'Private' }],
      },
    ],
  })
  await assert.rejects(entry([inaccessible.id], 'published'), /public/)
  const missingAlt = await list({
    items: [
      { layout: 'stacked', content: [{ blockType: 'image', media: image.id, caption: 'Image' }] },
    ],
  })
  await assert.rejects(entry([missingAlt.id], 'published'), /alt text/)
})
test('published references protect files even if a newer draft removes them', async () => {
  const file = await photo()
  const primary = await list({
    items: [
      {
        layout: 'stacked',
        content: [
          { blockType: 'image', media: file.id, alt: 'Evidence', caption: 'Retained evidence' },
        ],
      },
    ],
  })
  const doc = await entry([primary.id], 'published')
  const replacement = await list()
  await payload.update({
    collection: 'entries',
    id: doc.id,
    draft: true,
    data: { contentLists: [replacement.id], _status: 'draft' },
  })
  await assert.rejects(
    payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } }),
    /published/,
  )
  await assert.rejects(payload.delete({ collection: 'media', id: file.id }), /published/)
  await payload.update({ collection: 'entries', id: doc.id, data: { _status: 'draft' } })
  await payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } })
  await assert.rejects(payload.delete({ collection: 'media', id: file.id }), /entry history/)
  assert.equal(
    (await payload.findByID({ collection: 'content-lists', id: primary.id })).public,
    false,
  )
})
test('shared list delivery remains public until its last live entry is unpublished', async () => {
  const content = await list()
  const a = await entry([content.id], 'published'),
    b = await entry([content.id], 'published')
  await payload.update({ collection: 'entries', id: a.id, data: { _status: 'draft' } })
  assert.equal(
    (await payload.findByID({ collection: 'content-lists', id: content.id, overrideAccess: false }))
      .public,
    true,
  )
  await payload.delete({ collection: 'entries', id: b.id })
  await assert.rejects(
    payload.findByID({ collection: 'content-lists', id: content.id, overrideAccess: false }),
  )
})
test('publishing and media withdrawal cannot both win a concurrent race', async () => {
  const file = await photo()
  const content = await list({
    items: [
      {
        layout: 'stacked',
        content: [
          { blockType: 'image', media: file.id, alt: 'Image', caption: 'Concurrent evidence' },
        ],
      },
    ],
  })
  const doc = await entry([content.id])
  const results = await Promise.allSettled([
    payload.update({ collection: 'entries', id: doc.id, data: { _status: 'published' } }),
    payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } }),
  ])
  assert(results.some((result) => result.status === 'rejected'))
})
test('sources and interactive bundles remain protected, and source research notes remain private', async () => {
  const content = await list({
    items: [
      {
        layout: 'stacked',
        content: [
          {
            blockType: 'embed',
            snippet,
            title: 'Experiment',
            height: 400,
            caption: 'Caption',
            source,
          },
        ],
      },
    ],
  })
  await entry([content.id], 'published')
  await assert.rejects(payload.delete({ collection: 'sources', id: source }), /published/)
  await assert.rejects(
    payload.update({ collection: 'snippets', id: snippet, data: { _status: 'draft' } }),
    /published/,
  )
  const read = await payload.findByID({ collection: 'sources', id: source, overrideAccess: false })
  assert.equal(read.notes, undefined)
})

test('scheduled publishing and unpublishing use entry permissions and list publication hooks', async () => {
  const content = await list()
  const doc = await entry([content.id])
  await payload.jobs.queue({
    task: 'schedulePublish',
    input: {
      type: 'publish',
      doc: { relationTo: 'entries', value: doc.id },
      user: { relationTo: 'users', value: owner.id },
    },
    waitUntil: new Date(Date.now() - 1000),
  })
  const queued = await payload.find({
    collection: 'payload-jobs',
    overrideAccess: false,
    user: owner,
  })
  assert(queued.docs.length > 0)
  await assert.rejects(payload.find({ collection: 'payload-jobs', overrideAccess: false }))
  await payload.jobs.run({ limit: 10 })
  assert.equal(
    (await payload.findByID({ collection: 'entries', id: doc.id, overrideAccess: false }))._status,
    'published',
  )
  assert.equal(
    (await payload.findByID({ collection: 'content-lists', id: content.id, overrideAccess: false }))
      .public,
    true,
  )
  await payload.jobs.queue({
    task: 'schedulePublish',
    input: {
      type: 'unpublish',
      doc: { relationTo: 'entries', value: doc.id },
      user: { relationTo: 'users', value: owner.id },
    },
    waitUntil: new Date(Date.now() - 1000),
  })
  await payload.jobs.run({ limit: 10 })
  await assert.rejects(
    payload.findByID({ collection: 'entries', id: doc.id, overrideAccess: false }),
  )
  await assert.rejects(
    payload.findByID({ collection: 'content-lists', id: content.id, overrideAccess: false }),
  )
})
test('video, audio, links and downloads are available in the primary list as well as additional lists', async () => {
  const audioBytes = Buffer.from('ID3audio fixture')
  const audio = await payload.create({
    collection: 'media',
    data: { title: 'Audio', visibility: 'public' },
    file: { data: audioBytes, size: audioBytes.length, name: 'audio.mp3', mimetype: 'audio/mpeg' },
  })
  const content = await list({
    items: [
      {
        layout: 'stacked',
        content: [
          { blockType: 'audio', media: audio.id, caption: 'Audio evidence' },
          {
            blockType: 'video',
            sourceType: 'external',
            url: 'https://youtu.be/abcdefghijk',
            caption: 'Video evidence',
          },
          { blockType: 'download', media: image.id, label: 'File' },
          { blockType: 'link', url: 'https://example.com', label: 'Link' },
        ],
      },
    ],
  })
  const doc = await entry([content.id], 'published')
  const read = await payload.findByID({
    collection: 'entries',
    id: doc.id,
    depth: 2,
    overrideAccess: false,
  })
  assert.deepEqual(
    (read.contentLists[0] as ContentList).items?.[0].content?.map((block) => block.blockType),
    ['audio', 'video', 'download', 'link'],
  )
})
test('newer source and bundle metadata drafts preserve their published versions', async () => {
  await payload.update({
    collection: 'sources',
    id: source,
    draft: true,
    data: { title: 'Draft source', _status: 'draft' },
  })
  await payload.update({
    collection: 'snippets',
    id: snippet,
    draft: true,
    data: { title: 'Draft bundle', _status: 'draft' },
  })
  assert.equal(
    (await payload.findByID({ collection: 'sources', id: source, overrideAccess: false })).title,
    'Reference',
  )
  assert.equal(
    (await payload.findByID({ collection: 'snippets', id: snippet, overrideAccess: false })).title,
    'Experiment',
  )
})

test('published editorial-team-only entries and their lists stay private', async () => {
  const file = await photo('private')
  const content = await list({
    items: [
      {
        layout: 'stacked',
        content: [
          { blockType: 'image', media: file.id, alt: 'Private image', caption: 'Private evidence' },
        ],
      },
    ],
  })
  const doc = await payload.create({
    collection: 'entries',
    data: {
      title: 'Private entry',
      slug: `private-${++counter}`,
      visibility: 'private',
      contentLists: [content.id],
      _status: 'published',
    },
  })
  await assert.rejects(
    payload.findByID({ collection: 'entries', id: doc.id, overrideAccess: false }),
  )
  await assert.rejects(
    payload.findByID({ collection: 'content-lists', id: content.id, overrideAccess: false }),
  )
  await assert.rejects(
    payload.update({ collection: 'entries', id: doc.id, data: { visibility: 'public' } }),
    /public/,
  )
})

test('delivery queries return lightweight summaries, populate covers and exclude private or draft entries', async () => {
  const topic = await payload.create({
    collection: 'topics',
    data: { title: 'Delivery', slug: 'delivery' },
  })
  const primary = await list({
    items: [
      {
        content: [
          { blockType: 'image', media: image.id, alt: 'Cover alt', caption: 'Cover caption' },
          { blockType: 'richText', body: rich('Full body only belongs in detail responses.') },
        ],
      },
    ],
  })
  const slides = await list({ presentation: 'carousel', items: [{}, {}] })
  const doc = await payload.create({
    collection: 'entries',
    user: owner,
    data: {
      title: 'Public summary',
      visibility: 'public',
      slug: 'public-summary',
      topics: [topic.id],
      contentLists: [primary.id, slides.id],
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'entries',
    user: owner,
    data: {
      title: 'Private summary',
      contentLists: [(await list()).id],
      slug: 'private-summary',
      visibility: 'private',
      topics: [topic.id],
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'entries',
    user: owner,
    draft: true,
    data: { title: 'Draft summary', slug: 'draft-summary', topics: [topic.id] },
  })
  const summaries = await entrySummaries(payload, 1, topic.id)
  assert.equal(summaries.totalDocs, 1)
  const card = summaries.docs[0]
  assert.equal(card.id, doc.id)
  assert.equal(card.itemCount, 2)
  assert.equal(card.cover?.alt, 'Cover alt')
  assert.equal(typeof card.cover?.media, 'object')
  assert.equal(card.topics[0].id, topic.id)
  assert(!('contentLists' in card))
  assert(!JSON.stringify(card).includes('Full body only'))
  assert.equal((await entryBySlug(payload, 'public-summary'))?.id, doc.id)
  assert.equal(await entryBySlug(payload, 'private-summary'), null)
  assert.equal(await entryBySlug(payload, 'draft-summary'), null)
  await assert.rejects(entryBySlug(payload, 'draft-summary', { preview: true }), /authenticated/)
  assert.equal(
    (await entryBySlug(payload, 'draft-summary', { preview: true, user: owner }))?.title,
    'Draft summary',
  )
})

test('a list edit loaded before sealing cannot mutate an entry revision after publication wins', async () => {
  const candidate = await list({ title: 'Before publication' })
  const blocker = await payload.db.pool.connect()
  const waiting = async (count: number) => {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      const result = await blocker.query(
        "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory'",
      )
      if (result.rows[0].count >= count) return
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw new Error('Expected operations did not reach the publication lock.')
  }
  let publishing: Promise<unknown> | undefined, editing: Promise<unknown> | undefined
  try {
    await blocker.query('BEGIN')
    await blocker.query('SELECT pg_advisory_xact_lock(728451604)')
    publishing = entry([candidate.id], 'published')
    void publishing.catch(() => {})
    await waiting(1)
    editing = payload.update({
      collection: 'content-lists',
      id: candidate.id,
      user: owner,
      data: { title: 'Too late' },
    })
    void editing.catch(() => {})
    await waiting(2)
    await blocker.query('COMMIT')
    await publishing
    await assert.rejects(editing, /immutable/)
    const sealed = await payload.findByID({ collection: 'content-lists', id: candidate.id })
    assert.equal(sealed.title, 'Before publication')
    assert.equal(sealed.sealed, true)
    assert.equal(sealed.public, true)
  } finally {
    await blocker.query('ROLLBACK')
    blocker.release()
    await Promise.allSettled([publishing, editing].filter(Boolean))
  }
})

test('entry-level research sources remain protected through published snapshots and entry history', async () => {
  const evidence = await payload.create({
    collection: 'sources',
    data: {
      title: 'Entry research source',
      url: 'https://example.com/research',
      accessedAt: new Date().toISOString(),
      _status: 'published',
    },
  })
  const doc = await entry()
  await payload.update({
    collection: 'entries',
    id: doc.id,
    data: { sources: [evidence.id], _status: 'published' },
  })
  await payload.update({
    collection: 'entries',
    id: doc.id,
    draft: true,
    data: { sources: [], _status: 'draft' },
  })
  await assert.rejects(
    payload.update({ collection: 'sources', id: evidence.id, data: { _status: 'draft' } }),
    /published.*entry/,
  )
  await assert.rejects(payload.delete({ collection: 'sources', id: evidence.id }), /saved.*entry/)
  await payload.update({
    collection: 'entries',
    id: doc.id,
    data: { sources: [], _status: 'draft' },
  })
  await payload.update({ collection: 'sources', id: evidence.id, data: { _status: 'draft' } })
  await assert.rejects(payload.delete({ collection: 'sources', id: evidence.id }), /history/)
})
