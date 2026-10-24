import 'dotenv/config'
import { getPayload } from 'payload'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import config from '../src/payload.config'
import { required } from '@multimedia/cms/lib/env'
import { importBundle, readFolder } from '@multimedia/cms/lib/snippets/bundles'
import { newListData } from '@multimedia/cms/lib/content/new-list'
import type { ContentList } from '@multimedia/cms/types'
const database = new URL(required('DB_HCI_URL'))
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', 'postgres'].includes(database.hostname)
)
  throw new Error('Sample seed requires a local database.')
const payload = await getPayload({ config })
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
        format: '' as const,
        indent: 0,
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})
async function illustration(wide: boolean) {
  const buttons = Array.from(
    { length: 4 },
    (_, index) =>
      `<rect x="${wide ? 174 + index * 92 : 222 + index * 55}" y="${wide ? 259 : 269}" width="${wide ? 74 : 35}" height="${wide ? 54 : 32}" rx="${wide ? 10 : 5}" fill="${wide ? '#346d5d' : '#89948a'}"/><text x="${wide ? 211 + index * 92 : 239 + index * 55}" y="${wide ? 292 : 290}" text-anchor="middle" fill="white" font-family="Arial" font-size="${wide ? 18 : 12}">${index + 1}</text>`,
  ).join('')
  return sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="${wide ? '#e3eade' : '#e8e4db'}"/><text x="56" y="68" font-family="Arial" font-size="13" letter-spacing="3" fill="#506251">ILLUSTRATIVE INTERFACE / ${wide ? 'B' : 'A'}</text><rect x="130" y="130" width="700" height="390" rx="16" fill="#fafaf5" stroke="#c4cec0"/><path d="M130 186H830" stroke="#d1d7cc"/><circle cx="158" cy="158" r="5" fill="#b9bdae"/><circle cx="177" cy="158" r="5" fill="#c9c9bc"/><circle cx="196" cy="158" r="5" fill="#d6d5c7"/><text x="174" y="235" font-family="Georgia" font-size="26" fill="#263d32">Choose a workspace</text>${buttons}<rect x="174" y="352" width="330" height="10" rx="5" fill="#d9dfd2"/><rect x="174" y="379" width="520" height="10" rx="5" fill="#e6e9df"/><rect x="174" y="406" width="430" height="10" rx="5" fill="#e6e9df"/><text x="56" y="591" font-family="Georgia" font-size="27" fill="#435d4b">${wide ? 'A little more space to act.' : 'The same choice, a smaller target.'}</text></svg>`,
    ),
  )
    .png()
    .toBuffer()
}

try {
  if (
    (
      await payload.find({
        collection: 'entries',
        where: { slug: { equals: 'small-targets-bigger-decisions' } },
        limit: 1,
      })
    ).totalDocs
  ) {
    console.log('Primary sample entry already exists; preserved it.')
  } else {
    const topic =
      (
        await payload.find({
          collection: 'topics',
          where: { slug: { equals: 'interaction-studies' } },
          limit: 1,
        })
      ).docs[0] ||
      (await payload.create({
        collection: 'topics',
        data: { title: 'Interaction studies', slug: 'interaction-studies' },
      }))
    const source =
      (
        await payload.find({
          collection: 'sources',
          where: {
            url: { equals: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html' },
            _status: { equals: 'published' },
          },
          limit: 1,
        })
      ).docs[0] ||
      (await payload.create({
        collection: 'sources',
        data: {
          title: 'Understanding target size',
          url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
          publisher: 'W3C',
          accessedAt: new Date().toISOString(),
          _status: 'published',
        },
      }))
    const media = []
    for (const [index, wide] of [false, true].entries()) {
      const bytes = await illustration(wide)
      media.push(
        await payload.create({
          collection: 'media',
          data: {
            title: `Illustrative workspace ${wide ? 'B' : 'A'}`,
            alt: `A fictional workspace chooser with ${wide ? 'large' : 'small'} numbered buttons.`,
            visibility: 'public',
          },
          file: {
            data: bytes,
            size: bytes.length,
            name: `sample-workspace-${index}.png`,
            mimetype: 'image/png',
          },
        }),
      )
    }
    const imported = await importBundle({
      payload,
      title: 'Target size laboratory — sample',
      files: await readFolder('samples/snippets/target-lab'),
    })
    const snippet = await payload.update({
      collection: 'snippets',
      id: imported.id,
      data: { _status: 'published' },
    })
    const bytes = Buffer.from(
      'These examples illustrate the CMS. They are not measured usability research.\n',
    )
    const file = await payload.create({
      collection: 'media',
      data: { title: 'Sample evidence note', visibility: 'public' },
      file: {
        data: bytes,
        size: bytes.length,
        name: 'sample-evidence-note.txt',
        mimetype: 'text/plain',
      },
    })
    const items: Omit<NonNullable<ContentList['items']>[number], 'id' | 'key'>[] = [
      {
        title: 'Start with an observation',
        layout: 'stacked',
        content: [
          {
            blockType: 'richText',
            body: richText(
              'A list item can contain any combination of media, including text alone.',
            ),
          },
        ],
      },
      {
        title: 'Put the evidence side by side',
        layout: 'comparison',
        content: media.map((image, index) => ({
          blockType: 'image',
          media: image.id,
          alt: image.alt!,
          caption: `Illustrative prototype ${index ? 'B' : 'A'}: ${index ? 'larger targets' : 'compact controls'}. These are fictional concept diagrams.`,
          source: source.id,
        })),
      },
      {
        title: 'Try the interaction',
        layout: 'stacked',
        content: [
          {
            blockType: 'embed',
            snippet: snippet.id,
            title: 'Interactive target size example',
            height: 480,
            caption: 'A self-contained HTML/CSS/JS experiment. No measurements are collected.',
          },
        ],
      },
      {
        title: 'Keep a research trail',
        layout: 'stacked',
        content: [
          {
            blockType: 'link',
            url: source.url!,
            label: 'Read the W3C target-size explanation',
            source: source.id,
          },
          { blockType: 'download', media: file.id, label: 'Download the sample evidence note' },
        ],
      },
    ]
    const videoBytes = await readFile('samples/focus-demo.webm')
    const video = await payload.create({
      collection: 'media',
      data: { title: 'Illustrative focus-state video', visibility: 'public' },
      file: {
        data: videoBytes,
        size: videoBytes.length,
        name: 'sample-focus-demo.webm',
        mimetype: 'video/webm',
      },
    })
    items.splice(2, 0, {
      title: 'Watch a state change',
      layout: 'stacked',
      content: [
        {
          blockType: 'video',
          sourceType: 'upload',
          media: video.id,
          poster: media[1].id,
          caption:
            'A generated animation showing a focus indicator moving between fictional controls.',
          transcript: 'A focus outline moves between four controls.',
        },
      ],
    })
    const primary = await payload.create({
      collection: 'content-lists',
      data: newListData({
        title: 'Introduction',
        items: [
          {
            layout: 'stacked',
            content: [
              {
                blockType: 'richText',
                body: richText(
                  'Good research starts with noticing. This example keeps every caption, source and file attached to the observation it supports.',
                ),
              },
              {
                blockType: 'image',
                media: media[1].id,
                alt: media[1].alt!,
                caption: 'An illustrative interface, created to demonstrate this CMS.',
              },
            ],
          },
        ],
      }),
    })
    const evidence = await payload.create({
      collection: 'content-lists',
      data: newListData({ title: 'Evidence collection', presentation: 'carousel', items }),
    })
    const resources = await payload.create({
      collection: 'content-lists',
      data: newListData({
        title: 'Further reading',
        presentation: 'list',
        items: [
          {
            layout: 'stacked',
            content: [{ blockType: 'download', media: file.id, label: 'Evidence note' }],
          },
        ],
      }),
    })
    await payload.create({
      collection: 'entries',
      data: {
        visibility: 'public',
        title: 'Small targets, bigger decisions',
        slug: 'small-targets-bigger-decisions',
        summary:
          'Side-by-side examples, video and interactive evidence in multiple multimedia lists.',
        topics: [topic.id],
        sources: [source.id],
        byline: 'The field journal',
        contentLists: [primary.id, evidence.id, resources.id],
        _status: 'published',
      },
    })
  }
  for (const [title, slug] of [
    ['A clearer signal', 'a-clearer-signal'],
    ['Room to think', 'room-to-think'],
  ]) {
    if (
      (
        await payload.find({
          collection: 'entries',
          where: { slug: { equals: slug } },
          limit: 1,
        })
      ).totalDocs
    )
      continue
    const list = await payload.create({
      collection: 'content-lists',
      data: newListData({
        items: [
          {
            layout: 'stacked',
            content: [
              {
                blockType: 'richText',
                body: richText(
                  'A simple article uses exactly the same content model as a multimedia study.',
                ),
              },
            ],
          },
        ],
      }),
    })
    await payload.create({
      collection: 'entries',
      data: {
        visibility: 'public',
        title,
        slug,
        summary: 'An illustrative entry in a reusable multimedia CMS.',
        contentLists: [list.id],
        _status: 'published',
      },
    })
  }
  console.log(
    'Sample entries are ready; existing entries were preserved. No accounts were created.',
  )
} finally {
  await payload.destroy()
}
process.exit(0)
