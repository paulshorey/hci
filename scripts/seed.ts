import 'dotenv/config'
import { getPayload } from 'payload'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import config from '../src/payload.config'
import { required } from '../src/lib/env'
import { importBundle, readFolder } from '../src/lib/snippets/bundles'
import type { Post } from '../src/generated/payload-types'

const database = new URL(required('DATABASE_URL'))
if (
  process.env.NODE_ENV === 'production' ||
  !['127.0.0.1', 'localhost', 'postgres'].includes(database.hostname)
)
  throw new Error('Sample seed is restricted to local development/test databases.')
const payload = await getPayload({ config })
const richText = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
        direction: null,
        format: '',
        indent: 0,
      },
    ],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
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
        collection: 'posts',
        where: { slug: { equals: 'small-targets-bigger-decisions' } },
        limit: 1,
      })
    ).totalDocs
  ) {
    console.log('Sample content already exists; preserved it.')
  } else {
    const topic =
      (
        await payload.find({
          collection: 'topics',
          where: { slug: { equals: 'interface-studies' } },
          limit: 1,
        })
      ).docs[0] ||
      (await payload.create({
        collection: 'topics',
        data: {
          title: 'Interface studies',
          slug: 'interface-studies',
          description: 'Looking closely at how interfaces invite us to act.',
        },
      }))
    const source =
      (
        await payload.find({
          collection: 'sources',
          where: {
            url: { equals: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html' },
          },
          limit: 1,
        })
      ).docs[0] ||
      (await payload.create({
        collection: 'sources',
        data: {
          title: 'Understanding target size',
          publisher: 'W3C Web Accessibility Initiative',
          url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
          accessedAt: new Date().toISOString(),
          notes:
            'Sample reference. Replace these illustrative posts with your own researched evidence.',
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
            mimetype: 'image/png',
            name: `sample-workspace-${index}.png`,
            size: bytes.length,
          },
        }),
      )
    }
    const bundle = await importBundle({
      payload,
      title: 'Target size laboratory — sample',
      files: await readFolder('samples/snippets/target-lab'),
    })
    const snippet = await payload.update({
      collection: 'snippets',
      id: bundle.id,
      data: { _status: 'published' },
    })
    const note = Buffer.from(
      'Sample evidence note\n\nThese images and interactions are illustrative examples, not measured research.\nRecord your source URLs, access dates, captions, and observations here.\n',
    )
    const download = await payload.create({
      collection: 'media',
      data: { title: 'Sample evidence note', visibility: 'public' },
      file: {
        data: note,
        mimetype: 'text/plain',
        name: 'sample-evidence-note.txt',
        size: note.length,
      },
    })
    const slides: NonNullable<Post['slides']> = [
      {
        title: 'Start with an observation',
        layout: 'stacked',
        content: [
          {
            blockType: 'richText',
            body: richText(
              'These are fictional interface studies that demonstrate the template. A slide can be text alone, or it can bring together images, video, links, and interactive evidence. Add your own observations and connect each claim to its source.',
            ),
          },
        ],
      },
      {
        title: 'Put the evidence side by side',
        layout: 'comparison',
        content: media.map((item, index) => ({
          blockType: 'image' as const,
          media: item.id,
          alt: item.alt!,
          caption: `Illustrative prototype ${index ? 'B' : 'A'}: ${index ? 'larger targets with more spacing' : 'compact numbered controls'}. These are concept diagrams, not captured product screenshots.`,
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
            caption:
              'A self-contained HTML/CSS/JS experiment. Adjust the slider and select a target; no measurements are collected.',
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
            description: 'A primary reference for investigating target sizing in your own work.',
            source: source.id,
          },
          {
            blockType: 'download',
            media: download.id,
            label: 'Download the sample evidence note',
            description: 'An example of attaching a downloadable document to a slide.',
          },
        ],
      },
    ]
    try {
      const bytes = await readFile('samples/focus-demo.webm')
      const video = await payload.create({
        collection: 'media',
        data: { title: 'Illustrative focus-state video', visibility: 'public' },
        file: {
          data: bytes,
          mimetype: 'video/webm',
          name: 'sample-focus-demo.webm',
          size: bytes.length,
        },
      })
      slides.splice(2, 0, {
        title: 'Watch a state change',
        layout: 'stacked',
        content: [
          {
            blockType: 'video',
            sourceType: 'upload',
            media: video.id,
            poster: media[1].id,
            caption:
              'A generated sample animation showing a focus indicator moving between fictional controls.',
            transcript:
              'A focus outline moves from the first numbered control to the second, third, and fourth.',
          },
        ],
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    await payload.create({
      collection: 'posts',
      data: {
        title: 'Small targets, bigger decisions',
        slug: 'small-targets-bigger-decisions',
        summary:
          'A closer look at the space between intention and action — with side-by-side examples and an interaction you can try.',
        byline: 'The field journal',
        body: richText(
          'Good research starts with noticing. This example brings different kinds of evidence into a single sequence, while keeping every caption, source, and file attached to the observation it supports.',
        ),
        featuredImage: {
          media: media[1].id,
          alt: media[1].alt,
          caption: 'Illustrative workspace chooser, created for this template.',
        },
        topics: [topic.id],
        sources: [source.id],
        slides,
        _status: 'published',
      },
    })
    for (const [title, slug, summary, text] of [
      [
        'What an interface tells you while it waits',
        'while-an-interface-waits',
        'Loading is an interaction, too. A place to collect the states, signals, and small details that help us understand what comes next.',
        'Use this entry as a starting point for a study of progress, feedback, or uncertainty. Replace this sample with your own recordings and findings.',
      ],
      [
        'The evidence is part of the story',
        'evidence-is-part-of-the-story',
        'A useful observation has a trail: where it came from, what it shows, and what we still do not know.',
        'Keep claims and supporting evidence together. Each slide can carry its own sources, and the article can keep a broader bibliography. This is illustrative sample content.',
      ],
    ])
      await payload.create({
        collection: 'posts',
        data: {
          title,
          slug,
          summary,
          byline: 'The field journal',
          topics: [topic.id],
          slides: [
            {
              title: 'An open question',
              layout: 'stacked',
              content: [{ blockType: 'richText', body: richText(text) }],
            },
          ],
          _status: 'published',
        },
      })
    console.log(
      'Created three illustrative posts, media, a source, and an interactive bundle. No CMS accounts or default passwords were created.',
    )
  }
} finally {
  await payload.destroy()
}
process.exit(0)
