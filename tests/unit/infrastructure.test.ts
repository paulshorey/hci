import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRailwayContext, project } from 'railway/iac'
import application from '../../.railway/railway'
import bootstrap from '../../.railway/bootstrap'

test('infrastructure guards exact targets, preserves named resources and isolates embed secrets', async () => {
  const original = { ...process.env }
  try {
    delete process.env.HCI_STORAGE_PROVIDER
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
    assert.deepEqual(web.variables?.CMS_RUN_JOBS, { type: 'literal', value: 'true' })
    assert(!('CMS_RUN_JOBS' in (embeds.variables || {})))
    assert('PAYLOAD_SECRET' in (web.variables || {}))
    assert(!('PAYLOAD_SECRET' in (embeds.variables || {})))
    for (const service of [web, embeds]) {
      assert.deepEqual(service.variables?.DB_HCI_URL, {
        type: 'reference',
        resource: 'database.postgres',
        output: 'DATABASE_PUBLIC_URL',
      })
      assert(!('DATABASE_URL' in (service.variables || {})))
      for (const [variable, output] of Object.entries({
        S3_BUCKET: 'BUCKET',
        S3_ENDPOINT: 'ENDPOINT',
        S3_REGION: 'REGION',
        S3_ACCESS_KEY_ID: 'ACCESS_KEY_ID',
        S3_SECRET_ACCESS_KEY: 'SECRET_ACCESS_KEY',
      })) {
        assert.deepEqual(service.variables?.[variable], {
          type: 'reference',
          resource: 'bucket.assets',
          output,
        })
      }
      assert.deepEqual(service.variables?.S3_FORCE_PATH_STYLE, { type: 'literal', value: 'false' })
    }
    process.env.HCI_RAILWAY_TARGET = 'production'
    const production = await application(context, project)
    const prodWeb = (production.resources || []).flat().find((resource) => resource.name === 'web')!
    assert(prodWeb.type === 'service' && prodWeb.source?.branch === 'prod')
    process.env.HCI_STORAGE_PROVIDER = 'external-s3'
    delete process.env.HCI_BUCKET_REGION
    const external = await application(context, project)
    assert.deepEqual(
      (external.resources || [])
        .flat()
        .map((resource) => resource.name)
        .sort(),
      ['embeds', 'postgres', 'web'],
    )
    const externalWeb = (external.resources || [])
      .flat()
      .find((resource) => resource.name === 'web')!
    assert(externalWeb.type === 'service')
    assert.deepEqual(externalWeb.variables?.S3_BUCKET, {
      type: 'sharedReference',
      name: 'HCI_S3_BUCKET',
    })
    process.env.HCI_STORAGE_PROVIDER = 'unknown'
    await assert.rejects(async () => application(context, project), /HCI_STORAGE_PROVIDER/)
  } finally {
    for (const name of [
      'HCI_RAILWAY_PROJECT_ID',
      'HCI_RAILWAY_ENVIRONMENT_ID',
      'HCI_RAILWAY_TARGET',
      'HCI_BUCKET_REGION',
      'HCI_STORAGE_PROVIDER',
    ]) {
      if (original[name] === undefined) delete process.env[name]
      else process.env[name] = original[name]
    }
  }
})
