import { createHmac, timingSafeEqual } from 'node:crypto'
import { secret } from '@/lib/env'

export function previewToken(id: number | string, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ id: String(id), expires: Math.floor(now / 1000) + 900 }),
  ).toString('base64url')
  const signature = createHmac('sha256', secret('EMBED_PREVIEW_SECRET'))
    .update(body)
    .digest('base64url')
  return `${body}.${signature}`
}

export function validPreviewToken(token: string, id: string, now = Date.now()): boolean {
  try {
    const [body, signature, extra] = token.split('.')
    if (!body || !signature || extra) return false
    const expected = createHmac('sha256', secret('EMBED_PREVIEW_SECRET')).update(body).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return (
      data.id === id &&
      Number.isInteger(data.expires) &&
      data.expires > Math.floor(now / 1000) &&
      data.expires <= Math.floor(now / 1000) + 900
    )
  } catch {
    return false
  }
}
