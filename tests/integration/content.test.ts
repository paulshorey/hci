import 'dotenv/config'
import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from 'pg'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { Media, Source, Snippet, User } from '../../src/generated/payload-types'
import type { Post } from '../../src/generated/payload-types'
import { audioFixture } from '../fixtures/audio'

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
    // A global database for another project must never select HCI's database.
    process.env.DATABASE_URL = 'postgresql://unused:unused@127.0.0.1:1/wrong_project'
    process.env.DB_HCI_URL = url.href
    root = await mkdtemp(path.join(tmpdir(), 'hci-integration-'))
    process.env.STORAGE_DIR = root
    env = { ...process.env, DB_HCI_URL: url.href, STORAGE_DIR: root }
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
    const legacySnippet = await client.query(
      "INSERT INTO snippets(title, storage_prefix, bundle_version, entry_file, manifest, _status) VALUES ('Legacy experiment', 'snippets/legacy', 'legacy', 'index.html', '{\"files\":[]}', 'published') RETURNING id",
    )
    const legacyPost = await client.query(
      "INSERT INTO posts(title, slug, summary, featured_video_source_type, featured_snippet_id, _status) VALUES ('Legacy interactive article', 'legacy-interactive', 'A pre-caption fixture', 'upload', $1, 'published') RETURNING id",
      [legacySnippet.rows[0].id],
    )
    await client.query(
      "INSERT INTO _posts_v(parent_id, version_title, version_slug, version_summary, version_featured_video_source_type, version_featured_snippet_id, version__status, latest) VALUES ($1, 'Legacy interactive article', 'legacy-interactive', 'A pre-caption fixture', 'upload', $2, 'published', true)",
      [legacyPost.rows[0].id, legacySnippet.rows[0].id],
    )
    execFileSync('pnpm', ['exec', 'tsx', 'tests/integration/apply-baseline.ts', '4'], {
      env,
      stdio: 'pipe',
    })
    await client.query(
      "INSERT INTO posts(title, slug, summary, featured_video_source_type, featured_snippet_id, featured_snippet_caption, _status) VALUES ('An existing caption', 'retained-caption', 'Keep editorial context', 'upload', $1, 'An editorial caption', 'published')",
      [legacySnippet.rows[0].id],
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
  assert.equal(
    (
      await client.query(
        "SELECT featured_snippet_caption FROM posts WHERE slug = 'legacy-interactive'",
      )
    ).rows[0].featured_snippet_caption,
    'Interactive exhibit: Legacy experiment',
  )
  assert.equal(
    (
      await client.query(
        "SELECT featured_snippet_caption FROM posts WHERE slug = 'retained-caption'",
      )
    ).rows[0].featured_snippet_caption,
    'An editorial caption',
  )
  assert.equal(
    (
      await client.query(
        "SELECT version_featured_snippet_caption FROM _posts_v WHERE version_slug = 'legacy-interactive'",
      )
    ).rows[0].version_featured_snippet_caption,
    'Interactive exhibit: Legacy experiment',
  )
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
  assert.equal(
    (
      await payload.find({
        collection: 'posts',
        overrideAccess: false,
        where: { slug: { equals: 'retained-article' } },
      })
    ).totalDocs,
    0,
  )
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
    data: {
      title: 'Unreleased revision',
      slides: [
        {
          title: 'Replacement draft',
          layout: 'stacked',
          content: [
            { blockType: 'richText', body: richText('Draft without the published images') },
          ],
        },
      ],
      _status: 'draft',
    },
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
  await assert.rejects(
    payload.update({ collection: 'media', id: publicFile.id, data: { visibility: 'private' } }),
    /published post/,
  )
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

test('all published media placements prevent file replacement, withdrawal and deletion', async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#557766' } })
    .png()
    .toBuffer()
  const movie = await readFile('samples/focus-demo.webm')
  const cases: {
    name: string
    video?: boolean
    audio?: boolean
    post: (id: number) => Partial<Post>
  }[] = [
    {
      name: 'featured-image',
      post: (id) => ({ featuredImage: { media: id, alt: 'Fixture', caption: 'A cover' } }),
    },
    {
      name: 'featured-video',
      video: true,
      post: (id) => ({ featuredVideo: { sourceType: 'upload', media: id, caption: 'A movie' } }),
    },
    {
      name: 'featured-poster',
      post: (id) => ({
        featuredVideo: {
          sourceType: 'external',
          url: 'https://example.com/movie.mp4',
          poster: id,
          caption: 'An external movie',
        },
      }),
    },
    {
      name: 'slide-image',
      post: (id) => ({
        slides: [
          {
            layout: 'stacked',
            content: [{ blockType: 'image', media: id, alt: 'Fixture', caption: 'An image' }],
          },
        ],
      }),
    },
    {
      name: 'slide-video',
      video: true,
      post: (id) => ({
        slides: [
          {
            layout: 'stacked',
            content: [{ blockType: 'video', sourceType: 'upload', media: id, caption: 'A movie' }],
          },
        ],
      }),
    },
    {
      name: 'slide-poster',
      post: (id) => ({
        slides: [
          {
            layout: 'stacked',
            content: [
              {
                blockType: 'video',
                sourceType: 'external',
                url: 'https://example.com/movie.mp4',
                poster: id,
                caption: 'A movie poster',
              },
            ],
          },
        ],
      }),
    },
    {
      name: 'download',
      post: (id) => ({
        slides: [
          {
            layout: 'stacked',
            content: [{ blockType: 'download', media: id, label: 'Download evidence' }],
          },
        ],
      }),
    },
    {
      name: 'slide-audio',
      audio: true,
      post: (id) => ({
        slides: [
          {
            layout: 'stacked',
            content: [{ blockType: 'audio', media: id, caption: 'Recorded evidence' }],
          },
        ],
      }),
    },
  ]
  for (const example of cases) {
    const bytes = example.video ? movie : example.audio ? audioFixture() : png
    const file = await payload.create({
      collection: 'media',
      data: { title: example.name, visibility: 'public' },
      file: {
        name: `${example.name}.${example.video ? 'webm' : example.audio ? 'wav' : 'png'}`,
        data: bytes,
        size: bytes.length,
        mimetype: example.video ? 'video/webm' : example.audio ? 'audio/wav' : 'image/png',
      },
    })
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: example.name,
        slug: example.name,
        summary: 'A reference fixture',
        ...example.post(file.id),
        _status: 'published',
      },
    })
    await assert.rejects(
      payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } }),
      /published post/,
    )
    await assert.rejects(payload.delete({ collection: 'media', id: file.id }), /published post/)
    const replacement = Buffer.from('Replacement textual evidence')
    await assert.rejects(
      payload.update({
        collection: 'media',
        id: file.id,
        data: {},
        file: {
          name: 'replacement.txt',
          data: replacement,
          size: replacement.length,
          mimetype: 'text/plain',
        },
      }),
      /published post/,
    )
    assert.deepEqual(await readFile(path.join(root, 'media', file.filename!)), bytes)
    assert.equal(
      (await payload.findByID({ collection: 'media', id: file.id })).mimeType,
      file.mimeType,
    )
    await payload.update({ collection: 'media', id: file.id, data: { credit: 'Updated credit' } })
    await payload.update({
      collection: 'posts',
      id: post.id,
      draft: false,
      data: { _status: 'draft' },
    })
    assert.equal(
      (
        await payload.update({
          collection: 'media',
          id: file.id,
          data: {},
          file: {
            name: 'replacement.txt',
            data: replacement,
            size: replacement.length,
            mimetype: 'text/plain',
          },
        })
      ).mimeType,
      'text/plain',
    )
    assert.equal(
      (await payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } }))
        .visibility,
      'private',
    )
  }
})

test('published source and snippet dependencies can save newer drafts but cannot unpublish or delete', async () => {
  for (const [collection, doc] of [
    ['sources', publicSource],
    ['snippets', snippet],
  ] as const) {
    await assert.rejects(
      payload.update({ collection, id: doc.id, draft: false, data: { _status: 'draft' } }),
      /published post/,
    )
    await assert.rejects(payload.delete({ collection, id: doc.id }), /published post/)
    await payload.update({
      collection,
      id: doc.id,
      draft: true,
      data: { title: 'An unpublished metadata revision', _status: 'draft' },
    })
    assert.equal(
      (await payload.findByID({ collection, id: doc.id, overrideAccess: false }))._status,
      'published',
    )
    await assert.rejects(
      payload.update({ collection, id: doc.id, draft: false, data: { _status: 'draft' } }),
      /published post/,
    )
  }
})

test('site logos require public images and protect them until explicitly replaced', async () => {
  await assert.rejects(
    payload.updateGlobal({ slug: 'site-settings', data: { logo: privateFile.id } }),
    /public image/,
  )
  await payload.update({ collection: 'media', id: privateFile.id, data: { visibility: 'public' } })
  await payload.updateGlobal({ slug: 'site-settings', data: { logo: privateFile.id } })
  await assert.rejects(
    payload.update({ collection: 'media', id: privateFile.id, data: { visibility: 'private' } }),
    /site logo/,
  )
  const original = await readFile(path.join(root, 'media', privateFile.filename!))
  await assert.rejects(
    payload.update({
      collection: 'media',
      id: privateFile.id,
      data: {},
      file: {
        name: privateFile.filename!,
        data: original,
        size: original.length,
        mimetype: 'image/png',
      },
      overwriteExistingFiles: true,
    }),
    /site logo/,
  )
  assert.deepEqual(await readFile(path.join(root, 'media', privateFile.filename!)), original)
  await payload.updateGlobal({ slug: 'site-settings', data: { logo: null } })
  await payload.update({ collection: 'media', id: privateFile.id, data: { visibility: 'private' } })
})

test('bulk replacements, image edits, and file-identity changes preserve published evidence', async () => {
  const replacement = Buffer.from('Replacement textual evidence')
  const original = await readFile(path.join(root, 'media', publicFile.filename!))
  await assert.rejects(
    payload.update({
      collection: 'media',
      where: { id: { equals: publicFile.id } },
      data: {},
      file: {
        name: 'bulk-replacement.txt',
        data: replacement,
        size: replacement.length,
        mimetype: 'text/plain',
      },
    }),
    /published post/,
  )
  for (const data of [{ focalX: 20, focalY: 20 }, { mimeType: 'application/pdf' }])
    await assert.rejects(
      payload.update({ collection: 'media', id: publicFile.id, data }),
      /published post/,
    )
  assert.deepEqual(await readFile(path.join(root, 'media', publicFile.filename!)), original)
  await payload.update({
    collection: 'media',
    id: publicFile.id,
    data: { focalX: publicFile.focalX, focalY: publicFile.focalY, alt: 'Updated description' },
  })
})

test('concurrent post publication and media withdrawal/replacement cannot both commit', async () => {
  for (const replacement of [false, true]) {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#557766' },
    })
      .png()
      .toBuffer()
    const file = await payload.create({
      collection: 'media',
      data: { title: 'Race fixture', visibility: 'public' },
      file: { name: 'race.png', data: bytes, size: bytes.length, mimetype: 'image/png' },
    })
    const replacementBytes = Buffer.from('Replacement textual evidence')
    const slug = `publishing-race-${replacement}`
    const outcomes = await Promise.allSettled([
      payload.create({
        collection: 'posts',
        data: {
          title: 'Publishing race',
          slug,
          summary: 'Concurrent changes',
          featuredImage: { media: file.id, alt: 'Fixture', caption: 'Concurrent evidence' },
          _status: 'published',
        },
      }),
      payload.update({
        collection: 'media',
        id: file.id,
        data: replacement ? {} : { visibility: 'private' },
        ...(replacement
          ? {
              file: {
                name: 'race-replacement.txt',
                data: replacementBytes,
                size: replacementBytes.length,
                mimetype: 'text/plain',
              },
            }
          : {}),
      }),
    ])
    assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1)
    const posts = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug }, _status: { equals: 'published' } },
    })
    const media = await payload.findByID({ collection: 'media', id: file.id })
    assert(!posts.totalDocs || (media.visibility === 'public' && media.mimeType === 'image/png'))
  }
})

test('editors can organize media folders without moving objects or exposing folder names', async () => {
  const user = { ...editor, collection: 'users' as const }
  const folder = await payload.create({
    collection: 'payload-folders',
    data: { name: 'Private research library', folderType: ['media'] },
    user,
    overrideAccess: false,
  })
  const original = await payload.findByID({ collection: 'media', id: publicFile.id })
  await payload.update({
    collection: 'media',
    id: publicFile.id,
    data: { folder: folder.id },
    user,
    overrideAccess: false,
  })
  const moved = await payload.findByID({ collection: 'media', id: publicFile.id })
  assert.equal(moved.url, original.url)
  assert.deepEqual(
    await readFile(path.join(root, 'media', moved.filename!)),
    await readFile(path.join(root, 'media', original.filename!)),
  )
  await assert.rejects(payload.find({ collection: 'payload-folders', overrideAccess: false }))
  await assert.rejects(
    payload.delete({ collection: 'payload-folders', id: folder.id, user, overrideAccess: false }),
  )
  await payload.delete({
    collection: 'payload-folders',
    id: folder.id,
    user: { ...owner, collection: 'users' },
    overrideAccess: false,
  })
  assert.equal((await payload.findByID({ collection: 'media', id: publicFile.id })).folder, null)
})

test('uploaded-only sources publish evidence attachments and protect the live version', async () => {
  const file = await payload.create({
    collection: 'media',
    data: { title: 'Original dataset', visibility: 'private' },
    file: {
      name: 'dataset.csv',
      data: Buffer.from('condition,seconds\na,1\nb,2\n'),
      size: 26,
      mimetype: 'text/csv',
    },
  })
  await assert.rejects(
    payload.create({
      collection: 'sources',
      data: {
        title: 'Missing evidence',
        accessedAt: new Date().toISOString(),
        _status: 'published',
      },
    }),
    /URL or an uploaded/,
  )
  await assert.rejects(
    payload.create({
      collection: 'sources',
      data: {
        title: 'Private evidence',
        accessedAt: new Date().toISOString(),
        attachments: [file.id],
        _status: 'published',
      },
    }),
    /attachments public/,
  )
  await payload.update({ collection: 'media', id: file.id, data: { visibility: 'public' } })
  const source = await payload.create({
    collection: 'sources',
    data: {
      title: 'My collected dataset',
      accessedAt: new Date().toISOString(),
      attachments: [file.id],
      notes: 'Private reasoning',
      _status: 'published',
    },
  })
  const publicRead = await payload.findByID({
    collection: 'sources',
    id: source.id,
    depth: 1,
    overrideAccess: false,
  })
  assert.equal(publicRead.notes, undefined)
  assert.equal((publicRead.attachments![0] as Media).id, file.id)
  await payload.update({
    collection: 'sources',
    id: source.id,
    draft: true,
    data: { attachments: [], _status: 'draft' },
  })
  await assert.rejects(payload.delete({ collection: 'media', id: file.id }), /published source/)
  await assert.rejects(
    payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } }),
    /published source/,
  )
  await payload.update({
    collection: 'sources',
    id: source.id,
    draft: false,
    data: { _status: 'draft' },
  })
  await payload.update({ collection: 'media', id: file.id, data: { visibility: 'private' } })
})

test('media library accepts audio, datasets and downloadable ZIPs while keeping executables isolated', async () => {
  const cases = [
    { name: 'note.md', mimetype: 'text/markdown', data: Buffer.from('# Notes\n') },
    { name: 'data.json', mimetype: 'application/json', data: Buffer.from('{"observation":true}') },
    {
      name: 'archive.zip',
      mimetype: 'application/zip',
      data: await readFile('tests/fixtures/hello.zip'),
    },
    { name: 'voice.wav', mimetype: 'audio/wav', data: audioFixture() },
  ]
  for (const file of cases) {
    const media = await payload.create({
      collection: 'media',
      data: { title: file.name, visibility: 'private' },
      file: { ...file, size: file.data.length },
    })
    assert.equal(media.visibility, 'private')
    assert.equal(media.mimeType, file.mimetype)
  }
  await assert.rejects(
    payload.create({
      collection: 'media',
      data: { title: 'Unsafe inline HTML', visibility: 'private' },
      file: {
        name: 'index.html',
        data: Buffer.from('<script>alert(1)</script>'),
        size: 25,
        mimetype: 'text/html',
      },
    }),
  )
  await assert.rejects(
    payload.create({
      collection: 'posts',
      data: {
        title: 'Bad audio',
        slug: 'bad-audio',
        summary: 'A mismatch',
        _status: 'published',
        slides: [
          {
            layout: 'stacked',
            content: [{ blockType: 'audio', media: publicFile.id, caption: 'Audio caption' }],
          },
        ],
      },
    }),
    /audio/,
  )
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
