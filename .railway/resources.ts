import { bucket, database, type RailwayContext } from 'railway/iac'

export function deploymentResources(ctx: RailwayContext) {
  const expectedProject = process.env.HCI_RAILWAY_PROJECT_ID
  const expectedEnvironment = process.env.HCI_RAILWAY_ENVIRONMENT_ID
  const target = process.env.HCI_RAILWAY_TARGET
  const region = process.env.HCI_BUCKET_REGION
  const storageProvider = process.env.HCI_STORAGE_PROVIDER || 'railway'
  const computeRegion = 'us-east4-eqdc4a'
  if (!['railway', 'external-s3'].includes(storageProvider))
    throw new Error('HCI_STORAGE_PROVIDER must be railway or external-s3.')
  if (!expectedProject || ctx.projectId !== expectedProject)
    throw new Error('Set HCI_RAILWAY_PROJECT_ID to the explicitly selected project.')
  if (!expectedEnvironment || ctx.environmentId !== expectedEnvironment)
    throw new Error('Set HCI_RAILWAY_ENVIRONMENT_ID to the explicitly selected environment.')
  if (target !== 'development' && target !== 'production')
    throw new Error('HCI_RAILWAY_TARGET must be development or production.')
  if (storageProvider === 'railway' && !['sjc', 'iad', 'ams', 'sin'].includes(region || ''))
    throw new Error('Select HCI_BUCKET_REGION before provisioning: bucket regions are immutable.')
  const postgres = database('postgres', 'postgres', {
    image: 'ghcr.io/railwayapp-templates/postgres-ssl:17',
    defaultMountPath: '/var/lib/postgresql/data',
    region: computeRegion,
  })
  const assets =
    storageProvider === 'railway'
      ? bucket('assets', { region: region as 'sjc' | 'iad' | 'ams' | 'sin' })
      : undefined
  return { postgres, assets, computeRegion, branch: target === 'production' ? 'prod' : 'main' }
}
