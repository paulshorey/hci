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

export function storageDriver(): 'disk' | 's3' {
  const driver = process.env.STORAGE_DRIVER || 'disk'
  if (driver !== 'disk' && driver !== 's3') throw new Error(`Unknown STORAGE_DRIVER: ${driver}`)
  return driver
}

export function assertDurableStorage() {
  if (
    storageDriver() === 'disk' &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PERSISTENT_DISK !== 'true'
  )
    throw new Error('Use S3 storage in production, or explicitly configure a persistent disk.')
}

export function mediaUploadLimitMB(): number {
  const value = Number(process.env.MEDIA_MAX_UPLOAD_MB || 100)
  if (!Number.isInteger(value) || value < 1 || value > 500)
    throw new Error('MEDIA_MAX_UPLOAD_MB must be an integer between 1 and 500.')
  return value
}

export function secret(name = 'PAYLOAD_SECRET'): string {
  const value = required(name)
  if (value.length < 32 || value.startsWith('replace-with')) {
    throw new Error(`${name} must contain at least 32 randomly generated characters`)
  }
  return value
}
