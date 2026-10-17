import { defineRailway, preserve, project, ref, service } from 'railway/iac'
import { deploymentResources } from './resources.ts'

// Own only this graph, even when the project later hosts other applications.
export const partial = 'hci'

export default defineRailway((ctx) => {
  const { postgres, assets, computeRegion, branch } = deploymentResources(ctx)
  // Native references resolve to this environment's bucket without copying credentials.
  const storage = assets
    ? {
        S3_BUCKET: ref(assets, 'BUCKET'),
        S3_ENDPOINT: ref(assets, 'ENDPOINT'),
        S3_REGION: ref(assets, 'REGION'),
        S3_ACCESS_KEY_ID: ref(assets, 'ACCESS_KEY_ID'),
        S3_SECRET_ACCESS_KEY: ref(assets, 'SECRET_ACCESS_KEY'),
        S3_FORCE_PATH_STYLE: 'false',
      }
    : {
        S3_BUCKET: ctx.shared.HCI_S3_BUCKET,
        S3_ENDPOINT: ctx.shared.HCI_S3_ENDPOINT,
        S3_REGION: ctx.shared.HCI_S3_REGION,
        S3_ACCESS_KEY_ID: ctx.shared.HCI_S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: ctx.shared.HCI_S3_SECRET_ACCESS_KEY,
        S3_FORCE_PATH_STYLE: ctx.shared.HCI_S3_FORCE_PATH_STYLE,
      }
  const common = {
    NODE_ENV: 'production',
    PORT: '8080',
    STORAGE_DRIVER: 's3',
    DATABASE_URL: postgres.env.DATABASE_URL,
    SITE_URL: ctx.shared.HCI_SITE_URL,
    EMBED_ORIGIN: ctx.shared.HCI_EMBED_ORIGIN,
    EMBED_PREVIEW_SECRET: ctx.shared.HCI_EMBED_PREVIEW_SECRET,
    ...storage,
  }
  const web = service('web', {
    source: { repo: 'paulshorey/hci', branch },
    env: {
      ...common,
      PAYLOAD_SECRET: preserve(),
      CMS_BOOTSTRAP_EMAIL: preserve(),
      CMS_BOOTSTRAP_PASSWORD: preserve(),
      MEDIA_MAX_UPLOAD_MB: '100',
      S3_SIGNED_DOWNLOADS: 'true',
    },
    build: { builder: 'RAILPACK', buildCommand: 'pnpm build' },
    deploy: {
      preDeployCommand: ['pnpm db:migrate && pnpm cms:bootstrap'],
      multiRegionConfig: { [computeRegion]: { numReplicas: 1 } },
      startCommand: 'pnpm start',
      healthcheckPath: '/api/health',
      healthcheckTimeout: 60,
    },
  })
  const embeds = service('embeds', {
    source: { repo: 'paulshorey/hci', branch },
    env: common,
    build: { builder: 'RAILPACK', buildCommand: 'pnpm check-types' },
    deploy: {
      multiRegionConfig: { [computeRegion]: { numReplicas: 1 } },
      startCommand: 'pnpm embeds:start',
      healthcheckPath: '/health',
      healthcheckTimeout: 60,
    },
  })
  return project('HCI', { resources: [postgres, ...(assets ? [assets] : []), web, embeds] })
})
