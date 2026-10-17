import { defineRailway, project, service } from 'railway/iac'
import { deploymentResources } from './resources.ts'

// Use only for a confirmed empty environment, before configuring credentials.
export const partial = 'hci'
export default defineRailway((ctx) => {
  const { postgres, assets } = deploymentResources(ctx)
  return project('HCI', {
    resources: [postgres, ...(assets ? [assets] : []), service('web'), service('embeds')],
  })
})
