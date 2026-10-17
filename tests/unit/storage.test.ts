import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { S3Client } from '@aws-sdk/client-s3'
import { DiskStorage, S3Storage } from '../../src/lib/storage/index'

test('disk objects are immutable and reject unsafe keys', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hci-storage-'))
  const storage = new DiskStorage(root)
  try {
    await storage.write('snippets/one/index.html', Buffer.from('one'))
    await assert.rejects(storage.write('snippets/one/index.html', Buffer.from('two')))
    assert.equal((await storage.read('snippets/one/index.html')).toString(), 'one')
    await assert.rejects(storage.read('../outside'))
    await storage.remove('snippets/one/index.html')
    await assert.rejects(storage.read('snippets/one/index.html'))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('S3 adapter sends signed SDK requests, conditional creates, reads and deletes, and propagates failures', async () => {
  const objects = new Map<string, Buffer>()
  let conditional = false
  const server = createServer(async (req, res) => {
    assert.match(req.headers.authorization || '', /^AWS4-HMAC-SHA256/)
    const key = req.url!.split('?')[0]
    if (key.endsWith('/unavailable')) {
      res.writeHead(503)
      res.end()
      return
    }
    if (req.method === 'PUT') {
      conditional = req.headers['if-none-match'] === '*'
      if (objects.has(key)) {
        res.writeHead(412)
        res.end()
        return
      }
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      objects.set(key, Buffer.concat(chunks))
      res.writeHead(200)
      res.end()
    } else if (req.method === 'GET') {
      const bytes = objects.get(key)
      res.writeHead(bytes ? 200 : 404, { 'Content-Type': 'text/html' })
      res.end(bytes)
    } else {
      objects.delete(key)
      res.writeHead(204)
      res.end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const client = new S3Client({
    region: 'us-east-1',
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    maxAttempts: 1,
  })
  const storage = new S3Storage(client, 'test-bucket')
  try {
    await storage.write('snippets/one/index.html', Buffer.from('hello'), 'text/html')
    assert(conditional)
    assert.equal((await storage.read('snippets/one/index.html')).toString(), 'hello')
    await assert.rejects(
      storage.write('snippets/one/index.html', Buffer.from('changed'), 'text/html'),
    )
    await assert.rejects(storage.read('unavailable'))
    await storage.remove('snippets/one/index.html')
    await assert.rejects(storage.read('snippets/one/index.html'))
  } finally {
    client.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
