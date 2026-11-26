import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { pipeline } from 'node:stream/promises'
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

// Read the exact source service variables on stdin. Never write them into the archive.
const [directory, commit, references] = process.argv.slice(2)
assert.ok(
  directory && /^[a-f0-9]{40}$/.test(commit) && references,
  'Supply a new directory, deployed commit and restore query',
)
const env = JSON.parse(await new Response(process.stdin).text())
assert.equal(env.RAILWAY_PROJECT_ID, '114d34ca-984f-43a0-b9ac-6e0d72ee489e')
assert.equal(env.RAILWAY_ENVIRONMENT_ID, '9b8cb8a9-31f2-4913-8fa4-75eafd25f0da')
assert.equal(env.RAILWAY_SERVICE_ID, 'c531648b-bf4b-416f-8f6e-a75f41eead83')
assert.equal(env.SITE_URL, 'https://web-production-10708e.up.railway.app')
assert.equal(env.STORAGE_DRIVER, 's3')
assert.ok(URL.canParse(env.DB_HCI_URL), 'Missing or invalid production PostgreSQL URL')
const db = new URL(env.DB_HCI_URL)
assert.equal(db.protocol, 'postgresql:')
assert.equal(db.host, 'switchyard.proxy.rlwy.net:24607')
assert.equal(db.pathname, '/railway')
const sslMode = db.searchParams.get('sslmode') ?? 'require'
assert.ok(['require', 'verify-ca', 'verify-full'].includes(sslMode), 'PostgreSQL TLS is required')
process.umask(0o077)
await mkdir(directory)
const restoreQuery = path.join(directory, 'restore-file-references.sql')
await copyFile(references, restoreQuery)
const objects = path.resolve(directory, 'objects')
await mkdir(objects)
const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
})
async function inventory() {
  const result = []
  let token
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: env.S3_BUCKET, ContinuationToken: token }),
    )
    result.push(
      ...(page.Contents || []).map(({ Key, ETag, Size, LastModified }) => ({
        Key,
        ETag,
        Size,
        LastModified,
      })),
    )
    token = page.NextContinuationToken
  } while (token)
  return result
}
async function digest(filename) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk)
  return hash.digest('hex')
}
const before = await inventory()
const dump = path.join(directory, 'database.dump')
try {
  execFileSync(
    'pg_dump',
    ['--format=custom', '--no-owner', '--no-privileges', '--lock-wait-timeout=5s', '--file', dump],
    {
      env: {
        ...process.env,
        PGHOST: db.hostname,
        PGPORT: db.port,
        PGDATABASE: decodeURIComponent(db.pathname.slice(1)),
        PGUSER: decodeURIComponent(db.username),
        PGPASSWORD: decodeURIComponent(db.password),
        PGSSLMODE: sslMode,
        PGCONNECT_TIMEOUT: '15',
      },
      stdio: 'ignore',
    },
  )
} catch {
  throw new Error(
    'Production PostgreSQL dump failed. Check TLS, connectivity and dump permissions.',
  )
}
const files = []
for (const { Key, ETag, Size } of before) {
  assert.ok(Key, 'Missing storage object key')
  // S3 keys are flat and a key can also be another key's directory prefix.
  const file = createHash('sha256').update(Key).digest('hex')
  const filename = path.join(objects, file)
  const item = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key, IfMatch: ETag }))
  await pipeline(item.Body, createWriteStream(filename, { flags: 'wx' }))
  assert.equal((await stat(filename)).size, Size)
  files.push({
    key: Key,
    file,
    size: Size,
    sha256: await digest(filename),
    contentType: item.ContentType,
    cacheControl: item.CacheControl,
    contentDisposition: item.ContentDisposition,
    contentEncoding: item.ContentEncoding,
    metadata: item.Metadata,
  })
}
// A changing object inventory means the dump and bytes cannot be paired confidently.
assert.ok(isDeepStrictEqual(await inventory(), before), 'Source inventory changed during archive')
await writeFile(
  path.join(directory, 'manifest.json'),
  JSON.stringify(
    {
      commit,
      environment: env.RAILWAY_ENVIRONMENT_ID,
      capturedAt: new Date().toISOString(),
      dumpSha256: await digest(dump),
      referencesSha256: await digest(restoreQuery),
      files,
    },
    null,
    2,
  ),
  { flag: 'wx' },
)
console.log('Captured PostgreSQL and ' + files.length + ' storage objects.')
