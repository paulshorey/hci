import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertDurableStorage, required, storageDriver, storageRoot } from '@multimedia/cms/lib/env'

export interface ObjectStorage {
  write(key: string, bytes: Buffer, contentType: string): Promise<void>
  read(key: string): Promise<Buffer>
  remove(key: string): Promise<void>
}

export function safeRelativePath(value: string): string {
  if (
    !value ||
    value.length > 240 ||
    !/^[\p{L}\p{M}\p{N} _./-]+$/u.test(value) ||
    value
      .split('/')
      .some(
        (part) =>
          !part || part.trim() !== part || part === '.' || part === '..' || part.startsWith('.'),
      )
  ) {
    throw new Error(
      'File paths must be relative, without hidden files, empty components, or traversal.',
    )
  }
  return value
}

export class DiskStorage implements ObjectStorage {
  constructor(private root: string) {}
  private filename(key: string) {
    return path.join(this.root, safeRelativePath(key))
  }
  async write(key: string, bytes: Buffer) {
    const filename = this.filename(key)
    await mkdir(path.dirname(filename), { recursive: true })
    await writeFile(filename, bytes, { flag: 'wx' })
  }
  async read(key: string) {
    return readFile(this.filename(key))
  }
  async remove(key: string) {
    await unlink(this.filename(key)).catch((error) => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

export function s3Config() {
  return {
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  }
}

export class S3Storage implements ObjectStorage {
  constructor(
    private client: S3Client,
    private bucket: string,
  ) {}
  async write(key: string, bytes: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeRelativePath(key),
        Body: bytes,
        ContentType: contentType,
        IfNoneMatch: '*',
      }),
    )
  }
  async read(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: safeRelativePath(key) }),
    )
    if (!result.Body) throw new Error('Object not found')
    return Buffer.from(await result.Body.transformToByteArray())
  }
  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: safeRelativePath(key) }),
    )
  }
}

export function objectStorage(): ObjectStorage {
  const driver = storageDriver()
  assertDurableStorage()
  if (driver === 'disk') {
    return new DiskStorage(storageRoot())
  }
  return new S3Storage(new S3Client(s3Config()), required('S3_BUCKET'))
}
