import { s3Storage } from '@payloadcms/storage-s3'
import { required, storageDriver } from '@multimedia/cms/lib/env'
import { s3Config } from './index'

export function mediaStoragePlugin() {
  const enabled = storageDriver() === 's3'
  return s3Storage({
    enabled,
    // The prefix column is part of the contract in disk and S3 environments.
    alwaysInsertFields: true,
    bucket: enabled ? required('S3_BUCKET') : 'cms-disabled-storage',
    config: enabled ? s3Config() : { region: 'us-east-1' },
    collections: {
      media: {
        prefix: 'media',
        signedDownloads:
          process.env.S3_SIGNED_DOWNLOADS !== 'false'
            ? {
                expiresIn: 300,
                // Payload authorizes the file before the adapter runs. Keep editor
                // previews proxied; public bytes can go straight from the private bucket.
                shouldUseSignedURL: ({ req }) => !req.user,
              }
            : false,
      },
    },
  })
}
