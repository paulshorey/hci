import { bucket, database, type RailwayContext } from 'railway/iac'

export function deploymentResources(ctx: RailwayContext) {
  const expectedProject = process.env.HCI_RAILWAY_PROJECT_ID
  const expectedEnvironment = process.env.HCI_RAILWAY_ENVIRONMENT_ID
  const target = process.env.HCI_RAILWAY_TARGET
  const region = process.env.HCI_BUCKET_REGION
  if (!expectedProject || ctx.projectId !== expectedProject)
    throw new Error('Set HCI_RAILWAY_PROJECT_ID to the explicitly selected project.')
  if (!expectedEnvironment || ctx.environmentId !== expectedEnvironment)
    throw new Error('Set HCI_RAILWAY_ENVIRONMENT_ID to the explicitly selected environment.')
  if (target !== 'development' && target !== 'production')
    throw new Error('HCI_RAILWAY_TARGET must be development or production.')
  if (!['sjc', 'iad', 'ams', 'sin'].includes(region || ''))
    throw new Error('Select HCI_BUCKET_REGION before provisioning: bucket regions are immutable.')
  const postgres = database('postgres', 'postgres', {
    image: 'ghcr.io/railwayapp-templates/postgres-ssl:17',
    defaultMountPath: '/var/lib/postgresql/data',
  })
  const assets = bucket('assets', { region: region as 'sjc' | 'iad' | 'ams' | 'sin' })
  return { postgres, assets, branch: target === 'production' ? 'prod' : 'main' }
}
