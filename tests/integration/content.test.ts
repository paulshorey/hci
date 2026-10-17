import 'dotenv/config'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from 'pg'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { Media, Source, Snippet, User } from '../../src/generated/payload-types'

let payload: Payload
let client: Client
let control: Client
let root: string
let owner: User
let editor: User
let publicFile: Media
let privateFile: Media
let publicSource: Source
let draftSource: Source
let snippet: Snippet
let name: string
let env: NodeJS.ProcessEnv
let bootstrapResult: { successes: number; failures: number; role: string; total: number }
const richText = (text: string) => ({
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
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 },
        ],
      },
    ],
  },
})

before(
  async () => {
    const url = new URL(process.env.HCI_TEST_DATABASE_URL || '')
    if (
      !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname) ||
      !url.pathname.endsWith('_test')
    )
      throw new Error('Integration tests require a local HCI_TEST_DATABASE_URL ending in _test.')
    control = new Client({ connectionString: url.href })
    await control.connect()
    name = `hci_integration_${randomBytes(5).toString('hex')}_test`
    await control.query(`CREATE DATABASE "${name}"`)
    url.pathname = `/${name}`
    process.env.DATABASE_URL = url.href
    root = await mkdtemp(path.join(tmpdir(), 'hci-integration-'))
    process.env.STORAGE_DIR = root
    env = { ...process.env, DATABASE_URL: url.href, STORAGE_DIR: root }
    execFileSync('pnpm', ['exec', 'tsx', 'tests/integration/apply-baseline.ts'], {
      env,
      stdio: 'pipe',
    })
    client = new Client({ connectionString: url.href })
    await client.connect()
    const oldPost = await client.query(
      "INSERT INTO posts(title, slug, summary, featured_video_source_type, _status) VALUES ('Retained article', 'retained-article', 'A pre-upgrade fixture', 'upload', 'draft') RETURNING id",
    )
    await client.query(
      "INSERT INTO posts_slides(id, _parent_id, _order, title, layout) VALUES ('retained-slide', $1, 0, 'Original slide', 'stacked')",
      [oldPost.rows[0].id],
    )
    execFileSync('pnpm', ['db:migrate'], { env, stdio: 'pipe' })
    const { getPayload, createLocalReq, registerFirstUserOperation } = await import('payload')
    const { default: config } = await import('../../src/payload.config')
    payload = await getPayload({ config })
    const registrations = await Promise.allSettled(
      [0, 1].map(async (index) =>
        registerFirstUserOperation({
          collection: payload.collections.users,
          data: {
            name: 'Owner',
            email: `bootstrap-${index}@example.test`,
            password: randomBytes(24).toString('hex'),
            role: 'editor',
          },
          req: await createLocalReq({}, payload),
        }),
      ),
    )
    const winner = registrations.find((result) => result.status === 'fulfilled')
    if (!winner || winner.status !== 'fulfilled' || !winner.value.user)
      throw new Error('Initial registration failed.')
    owner = winner.value.user
    bootstrapResult = {
      successes: registrations.filter((result) => result.status === 'fulfilled').length,
      failures: registrations.filter((result) => result.status === 'rejected').length,
      role: owner.role,
      total: (await payload.count({ collection: 'users' })).totalDocs,
    }
    editor = await payload.create({
      collection: 'users',
      user: { ...owner, collection: 'users' },
      data: {
        name: 'Editor',
        email: 'editor@example.test',
        password: randomBytes(24).toString('hex'),
        role: 'editor',
      },
    })
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#557766' } })
      .png()
      .toBuffer()
    const upload = (name: string) => ({ data: png, name, mimetype: 'image/png', size: png.length })
    publicFile = await payload.create({
      collection: 'media',
      data: { title: 'Public image', visibility: 'public' },
      file: upload('public-test.png'),
    })
    privateFile = await payload.create({
      collection: 'media',
      data: { title: 'Private image', visibility: 'private' },
      file: upload('private-test.png'),
    })
    publicSource = await payload.create({
      collection: 'sources',
      data: {
        title: 'Published source',
        url: 'https://example.com/evidence',
        accessedAt: new Date().toISOString(),
        notes: 'Private editorial notes',
        _status: 'published',
      },
    })
    draftSource = await payload.create({
      collection: 'sources',
      data: {
        title: 'Draft source',
        url: 'https://example.com/draft',
        accessedAt: new Date().toISOString(),
        _status: 'draft',
      },
    })
    const { importBundle } = await import('../../src/lib/snippets/bundles')
    snippet = await importBundle({
      payload,
      title: 'Test bundle',
      files: [{ path: 'index.html', bytes: Buffer.from('<h1>Example</h1>') }],
    })
  },
  { timeout: 60000 },
)

after(async () => {
  if (payload) {
    // The pinned adapter retains one reconnect client. Close idle clients before
    // forcibly dropping only this run's isolated test database.
    payload.db.pool.on('error', () => {})
    void payload.db.pool.end()
  }
  await payload?.destroy()
  await client?.end()
  if (control) {
    if (name) await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await control.end()
  }
  if (root) await rm(root, { recursive: true, force: true })
})

test('forward migration preserves populated posts and ordered slide identifiers', async () => {
  const result = await client.query(
    "SELECT p.title, s.id, s._order FROM posts p JOIN posts_slides s ON s._parent_id = p.id WHERE p.slug = 'retained-article'",
  )
  assert.deepEqual(result.rows, [{ title: 'Retained article', id: 'retained-slide', _order: 0 }])
  await client.query('SELECT credit_u_r_l, license FROM media LIMIT 0')
})

test('concurrent native first-user registrations create exactly one server-assigned administrator', () => {
  assert.deepEqual(bootstrapResult, { successes: 1, failures: 1, role: 'admin', total: 1 })
})

test('anonymous callers cannot write or read drafts, users, or private uploads', async () => {
  await assert.rejects(
    payload.create({
      collection: 'topics',
      overrideAccess: false,
      data: { title: 'No', slug: 'no' },
    }),
  )
  await assert.rejects(
    payload.create({
      collection: 'users',
      overrideAccess: false,
      data: {
        name: 'Intruder',
        email: 'intruder@example.test',
        password: randomBytes(24).toString('hex'),
        role: 'admin',
      },
    }),
  )
  assert.equal((await payload.find({ collection: 'users', overrideAccess: false })).totalDocs, 0)
  assert.equal(
    await payload.findByID({
      collection: 'media',
      id: privateFile.id,
      overrideAccess: false,
      disableErrors: true,
    }),
    null,
  )
  assert(
    (await payload.findByID({ collection: 'media', id: publicFile.id, overrideAccess: false })).id,
  )
  assert.equal((await payload.find({ collection: 'posts', overrideAccess: false })).totalDocs, 0)
  assert.equal(
    await payload.findByID({
      collection: 'snippets',
      id: snippet.id,
      overrideAccess: false,
      disableErrors: true,
    }),
    null,
  )
})

test('editors cannot promote their account role', async () => {
  await payload.update({
    collection: 'users',
    id: editor.id,
    overrideAccess: false,
    user: { ...editor, collection: 'users' },
    data: { role: 'admin' },
  })
  assert.equal((await payload.findByID({ collection: 'users', id: editor.id })).role, 'editor')
  assert.equal(owner.role, 'admin')
})

test('publication requires captions, alt text, accessible media, and published source/snippet references', async () => {
  const base = {
    title: 'Publication test',
    slug: 'publication-test',
    summary: 'Summary',
    _status: 'published' as const,
  }
  const image = {
    blockType: 'image' as const,
    media: publicFile.id,
    alt: 'A test image',
    caption: 'A contextual caption',
  }
  const create = (block: Record<string, unknown>) =>
    payload.create({
      collection: 'posts',
      data: { ...base, slides: [{ layout: 'stacked', content: [block as typeof image] }] },
    })
  await assert.rejects(create({ ...image, caption: '' }), /caption/)
  await assert.rejects(create({ ...image, alt: '' }), /alt text/)
  await assert.rejects(create({ ...image, media: privateFile.id }), /Publish referenced media/)
  await assert.rejects(create({ ...image, source: draftSource.id }), /referenced sources/)
  await assert.rejects(
    create({
      blockType: 'embed',
      snippet: snippet.id,
      title: 'Private bundle',
      height: 420,
      caption: 'A caption',
    }),
    /referenced snippets/,
  )
})

test('slides round-trip and reorder with their IDs, multiple media, captions, and missing types intact', async () => {
  const post = await payload.create({
    collection: 'posts',
    data: {
      title: 'Round trip',
      slug: 'round-trip',
      summary: 'Summary',
      _status: 'published',
      slides: [
        {
          title: 'Text only',
          layout: 'stacked',
          content: [{ blockType: 'richText', body: richText('Text without media') }],
        },
        {
          title: 'Comparison',
          layout: 'comparison',
          content: [
            {
              blockType: 'image',
              media: publicFile.id,
              alt: 'Left',
              caption: 'Left caption',
              source: publicSource.id,
            },
            { blockType: 'image', media: publicFile.id, alt: 'Right', caption: 'Right caption' },
          ],
        },
      ],
    },
  })
  const original = post.slides!
  await payload.update({
    collection: 'posts',
    id: post.id,
    data: { slides: [...original].reverse() },
  })
  const read = await payload.findByID({
    collection: 'posts',
    id: post.id,
    overrideAccess: false,
    depth: 2,
  })
  assert.equal(read.slides![0].id, original[1].id)
  assert.equal(read.slides![1].id, original[0].id)
  const block = read.slides![0].content[0]
  assert.equal(block.blockType, 'image')
  if (block.blockType === 'image') assert.equal(block.caption, 'Left caption')
  assert.equal(read.slides![1].content[0].blockType, 'richText')
})

test('saving a newer draft retains the published article for anonymous readers', async () => {
  const post = (
    await payload.find({ collection: 'posts', where: { slug: { equals: 'round-trip' } }, limit: 1 })
  ).docs[0]
  await payload.update({
    collection: 'posts',
    id: post.id,
    draft: true,
    data: { title: 'Unreleased revision', _status: 'draft' },
  })
  const publicPost = await payload.findByID({
    collection: 'posts',
    id: post.id,
    overrideAccess: false,
  })
  assert.equal(publicPost.title, 'Round trip')
  const draft = await payload.findByID({
    collection: 'posts',
    id: post.id,
    user: { ...editor, collection: 'users' },
    overrideAccess: false,
    draft: true,
  })
  assert.equal(draft.title, 'Unreleased revision')
})

test('public sources omit private research notes', async () => {
  const source = await payload.findByID({
    collection: 'sources',
    id: publicSource.id,
    overrideAccess: false,
  })
  assert.equal(source.notes, undefined)
})

test('bundle metadata can publish but its files and manifest cannot mutate', async () => {
  await assert.rejects(
    payload.update({
      collection: 'snippets',
      id: snippet.id,
      data: { storagePrefix: 'snippets/replacement' },
    }),
    /immutable/,
  )
  await assert.rejects(
    payload.create({
      collection: 'snippets',
      data: {
        title: 'Bypass',
        storagePrefix: 'snippets/bypass',
        bundleVersion: 'v1',
        entryFile: 'index.html',
        manifest: {},
      },
    }),
    /validated bundle importer/,
  )
  await payload.update({ collection: 'snippets', id: snippet.id, data: { _status: 'published' } })
  assert.equal(
    (await payload.findByID({ collection: 'snippets', id: snippet.id, overrideAccess: false }))
      ._status,
    'published',
  )
})

test('featured embeds require a contextual caption and published source', async () => {
  const data = {
    title: 'Featured experiment',
    slug: 'featured-experiment',
    summary: 'A featured bundle',
    featuredSnippet: snippet.id,
    _status: 'published' as const,
  }
  await assert.rejects(payload.create({ collection: 'posts', data }), /caption/)
  await assert.rejects(
    payload.create({
      collection: 'posts',
      data: {
        ...data,
        featuredSnippetCaption: 'A contextual explanation',
        featuredSnippetSource: draftSource.id,
      },
    }),
    /referenced sources/,
  )
  const post = await payload.create({
    collection: 'posts',
    data: {
      ...data,
      featuredSnippetCaption: 'A contextual explanation',
      featuredSnippetSource: publicSource.id,
    },
  })
  const read = await payload.findByID({ collection: 'posts', id: post.id, overrideAccess: false })
  assert.equal(read.featuredSnippetCaption, 'A contextual explanation')
})

test('migration runner is idempotent and refuses a modified applied checksum', async () => {
  const before = await client.query('SELECT count(*)::int AS count FROM posts')
  execFileSync('pnpm', ['db:migrate'], { env, stdio: 'pipe' })
  assert.equal(
    (await client.query('SELECT count(*)::int AS count FROM posts')).rows[0].count,
    before.rows[0].count,
  )
  const row = (
    await client.query('SELECT name, checksum FROM hci_migration_checksums ORDER BY name LIMIT 1')
  ).rows[0]
  await client.query('UPDATE hci_migration_checksums SET checksum = $1 WHERE name = $2', [
    'changed',
    row.name,
  ])
  try {
    assert.throws(
      () => execFileSync('pnpm', ['db:migrate'], { env, stdio: 'pipe' }),
      /Applied migration is missing or changed/,
    )
  } finally {
    await client.query('UPDATE hci_migration_checksums SET checksum = $1 WHERE name = $2', [
      row.checksum,
      row.name,
    ])
  }
})
