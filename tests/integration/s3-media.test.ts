import 'dotenv/config'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { execFileSync } from 'node:child_process'
import { Client } from 'pg'

test(
  'one migrated schema supports S3 uploads, authorized delivery, signed public downloads and upload limits',
  { timeout: 60000 },
  async () => {
    const base = new URL(process.env.HCI_TEST_DATABASE_URL || '')
    if (
      !['127.0.0.1', 'localhost', 'postgres'].includes(base.hostname) ||
      !base.pathname.endsWith('_test')
    )
      throw new Error('Use a disposable local test database.')
    const control = new Client({ connectionString: base.href })
    await control.connect()
    const name = `hci_s3_${randomBytes(5).toString('hex')}_test`
    await control.query(`CREATE DATABASE "${name}"`)
    base.pathname = `/${name}`
    const objects = new Map<string, { bytes: Buffer; type: string }>()
    let requests = 0
    const server = createServer(async (req, res) => {
      requests++
      assert.match(req.headers.authorization || '', /^AWS4-HMAC-SHA256/)
      const key = req.url!.split('?')[0]
      if (req.method === 'PUT') {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        objects.set(key, {
          bytes: Buffer.concat(chunks),
          type: req.headers['content-type'] || 'application/octet-stream',
        })
        res.writeHead(200, { ETag: '"fixture"' })
        res.end()
        return
      }
      if (req.method === 'DELETE') {
        objects.delete(key)
        res.writeHead(204)
        res.end()
        return
      }
      const object = objects.get(key)
      if (!object) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, {
        'Content-Type': object.type,
        'Content-Length': object.bytes.length,
        ETag: '"fixture"',
      })
      res.end(req.method === 'HEAD' ? undefined : object.bytes)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    Object.assign(process.env, {
      DATABASE_URL: base.href,
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'hci-test',
      S3_REGION: 'auto',
      S3_ENDPOINT: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      S3_FORCE_PATH_STYLE: 'true',
      S3_ACCESS_KEY_ID: 'fixture',
      S3_SECRET_ACCESS_KEY: 'fixture',
      S3_SIGNED_DOWNLOADS: 'true',
      MEDIA_MAX_UPLOAD_MB: '1',
    })
    let payload: import('payload').Payload | undefined
    try {
      // Deliberately migrate under disk mode, then use the identical DB in S3 mode.
      execFileSync('pnpm', ['db:migrate'], {
        env: { ...process.env, STORAGE_DRIVER: 'disk' },
        stdio: 'pipe',
      })
      const { getPayload, handleEndpoints } = await import('payload')
      const { default: config } = await import('../../src/payload.config')
      payload = await getPayload({ config })
      const email = 'storage@example.test'
      const password = randomBytes(24).toString('hex')
      await payload.create({
        collection: 'users',
        data: { name: 'Storage test owner', email, password, role: 'editor' },
      })
      const login = await payload.login({ collection: 'users', data: { email, password } })
      const bytes = Buffer.from('Manually uploaded evidence')
      const file = await payload.create({
        collection: 'media',
        data: { title: 'Private evidence', visibility: 'private' },
        file: { name: 'evidence.txt', data: bytes, size: bytes.length, mimetype: 'text/plain' },
      })
      assert.equal(file.prefix, 'media')
      assert.equal(objects.size, 1)
      const api = (url: string, init?: RequestInit) =>
        handleEndpoints({
          config,
          request: new Request(new URL(url, 'http://localhost:4500'), init),
        })
      const before = requests
      const privateRead = await api(file.url!)
      assert([403, 404].includes(privateRead.status))
      assert.equal(requests, before, 'Private reads must be rejected before contacting storage.')
      await payload.update({ collection: 'media', id: file.id, data: { visibility: 'public' } })
      const response = await api(file.url!)
      assert.equal(response.status, 302)
      const signed = new URL(response.headers.get('location')!)
      assert.equal(signed.searchParams.get('X-Amz-Expires'), '300')
      assert(signed.pathname.endsWith(`/media/${file.filename}`))
      assert.equal(
        requests,
        before,
        'Public delivery should sign locally instead of proxying bytes.',
      )
      const authenticated = await api(file.url!, {
        headers: { Authorization: `JWT ${login.token}` },
      })
      assert.equal(authenticated.status, 200)
      assert.equal(await authenticated.text(), bytes.toString())
      const form = new FormData()
      form.set('_payload', JSON.stringify({ title: 'Oversized evidence' }))
      form.set(
        'file',
        new File([new Uint8Array(1.5 * 1024 * 1024)], 'large.txt', { type: 'text/plain' }),
      )
      assert.equal(
        (
          await api('/api/media', {
            method: 'POST',
            headers: { Authorization: `JWT ${login.token}`, Origin: 'http://localhost:4500' },
            body: form,
          })
        ).status,
        413,
      )
      assert.equal(objects.size, 1)
      await payload.delete({ collection: 'media', id: file.id })
      assert.equal(objects.size, 0)
    } finally {
      if (payload) {
        payload.db.pool.on('error', () => {})
        void payload.db.pool.end()
        await payload.destroy()
      }
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      await control.end()
    }
  },
)
