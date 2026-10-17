import { execFileSync } from 'node:child_process'

const projectId = process.env.HCI_RAILWAY_PROJECT_ID
const environmentId = process.env.HCI_RAILWAY_ENVIRONMENT_ID
const target = process.env.HCI_RAILWAY_TARGET
if (!projectId || !environmentId || !['development', 'production'].includes(target || ''))
  throw new Error('Select the exact HCI project, environment and deployment target.')

function api<T>(query: string, variables: object): T {
  const response = JSON.parse(
    execFileSync('railway', ['api', query, '--variables', '@-'], {
      input: JSON.stringify(variables),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }),
  ) as { data?: T; errors?: unknown[] }
  if (response.errors?.length || !response.data) throw new Error('Railway backup operation failed.')
  return response.data
}

const { project } = api<{
  project: {
    id: string
    name: string
    volumes: {
      edges: {
        node: {
          volumeInstances: {
            edges: {
              node: {
                id: string
                environmentId: string
                service: { name: string }
              }
            }[]
          }
        }
      }[]
    }
  }
}>(
  'query($id:String!){project(id:$id){id name volumes{edges{node{volumeInstances{edges{node{id environmentId service{name}}}}}}}}}',
  { id: projectId },
)
if (project.id !== projectId || project.name !== 'HCI')
  throw new Error('Unexpected Railway project.')
const volumes = project.volumes.edges
  .flatMap(({ node }) => node.volumeInstances.edges)
  .map(({ node }) => node)
  .filter((node) => node.environmentId === environmentId && node.service.name === 'postgres')
if (volumes.length !== 1)
  throw new Error('Expected exactly one PostgreSQL volume in this environment.')
const id = volumes[0].id
const kinds = target === 'production' ? ['DAILY', 'WEEKLY', 'MONTHLY'] : ['DAILY']
const read = () =>
  api<{ volumeInstanceBackupScheduleList: { kind: string }[] }>(
    'query($id:String!){volumeInstanceBackupScheduleList(volumeInstanceId:$id){kind}}',
    { id },
  )
    .volumeInstanceBackupScheduleList.map(({ kind }) => kind)
    .sort()
const expected = [...kinds].sort()
if (JSON.stringify(read()) !== JSON.stringify(expected)) {
  api(
    'mutation($id:String!,$kinds:[VolumeInstanceBackupScheduleKind!]!){volumeInstanceBackupScheduleUpdate(volumeInstanceId:$id,kinds:$kinds)}',
    { id, kinds },
  )
}
if (JSON.stringify(read()) !== JSON.stringify(expected))
  throw new Error('Backup schedule verification failed.')
console.log(`Verified ${target} PostgreSQL backup schedules: ${kinds.join(', ')}.`)
