import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { importBundle, readFolder } from '../src/lib/snippets/bundles'

const [folder, title, entryFile = 'index.html'] = process.argv.slice(2)
if (!folder || !title)
  throw new Error('Usage: pnpm snippets:import /absolute/folder "Bundle title" [index.html]')
const payload = await getPayload({ config })
try {
  const snippet = await importBundle({ payload, files: await readFolder(folder), title, entryFile })
  console.log(`Imported draft bundle ${snippet.id}. Preview and publish it in Payload.`)
} finally {
  await payload.destroy()
}
process.exit(0)
