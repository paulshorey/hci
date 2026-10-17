import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRailwayContext, project } from 'railway/iac'
import application from '../../.railway/railway'
import bootstrap from '../../.railway/bootstrap'

test('infrastructure guards exact targets, preserves named resources and isolates embed secrets', async () => {
  const original = { ...process.env }
  try {
    process.env.HCI_RAILWAY_PROJECT_ID = 'test-project'
    process.env.HCI_RAILWAY_ENVIRONMENT_ID = 'test-environment'
    process.env.HCI_RAILWAY_TARGET = 'development'
    delete process.env.HCI_BUCKET_REGION
    const context = createRailwayContext({
      projectId: 'test-project',
      environmentId: 'test-environment',
    })
    await assert.rejects(async () => application(context, project), /region/)
    process.env.HCI_BUCKET_REGION = 'iad'
    await assert.rejects(
      async () =>
        application(
          createRailwayContext({ projectId: 'other-project', environmentId: 'test-environment' }),
          project,
        ),
      /explicitly selected project/,
    )
    const development = await application(context, project)
    const initial = await bootstrap(context, project)
    const developmentResources = (development.resources || []).flat()
    const initialResources = (initial.resources || []).flat()
    assert.deepEqual(
      developmentResources.map((resource) => resource.name).sort(),
      initialResources.map((resource) => resource.name).sort(),
    )
    const web = developmentResources.find((resource) => resource.name === 'web')!
    const embeds = developmentResources.find((resource) => resource.name === 'embeds')!
    assert.equal(web.type, 'service')
    assert.equal(embeds.type, 'service')
    if (web.type !== 'service' || embeds.type !== 'service') throw new Error('Expected services')
    assert.equal(web.source?.branch, 'main')
    assert('PAYLOAD_SECRET' in (web.variables || {}))
    assert(!('PAYLOAD_SECRET' in (embeds.variables || {})))
    process.env.HCI_RAILWAY_TARGET = 'production'
    const production = await application(context, project)
    const prodWeb = (production.resources || []).flat().find((resource) => resource.name === 'web')!
    assert(prodWeb.type === 'service' && prodWeb.source?.branch === 'prod')
  } finally {
    for (const name of [
      'HCI_RAILWAY_PROJECT_ID',
      'HCI_RAILWAY_ENVIRONMENT_ID',
      'HCI_RAILWAY_TARGET',
      'HCI_BUCKET_REGION',
    ]) {
      if (original[name] === undefined) delete process.env[name]
      else process.env[name] = original[name]
    }
  }
})
