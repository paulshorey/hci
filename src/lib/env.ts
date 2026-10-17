import 'dotenv/config'
import path from 'node:path'

export function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function siteURL(): string {
  return new URL(process.env.SITE_URL || 'http://localhost:4500').origin
}

export function embedOrigin(): string {
  const origin = new URL(process.env.EMBED_ORIGIN || 'http://localhost:4501').origin
  if (origin === siteURL()) throw new Error('EMBED_ORIGIN must differ from SITE_URL')
  return origin
}

export const storageRoot = () => path.resolve(process.env.STORAGE_DIR || './storage')

export function secret(name = 'PAYLOAD_SECRET'): string {
  const value = required(name)
  if (value.length < 32 || value.startsWith('replace-with')) {
    throw new Error(`${name} must contain at least 32 randomly generated characters`)
  }
  return value
}
