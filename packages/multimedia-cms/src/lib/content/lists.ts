import { randomUUID } from 'node:crypto'
import {
  APIError,
  type CollectionBeforeValidateHook,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type Endpoint,
  type PayloadRequest,
} from 'payload'
import { relationID } from './values'
import { lockPublishedContent } from './transactions'
import { copyList } from './revisions'
export { copyList } from './revisions'

export const listIDs = (values: unknown): number[] =>
  Array.isArray(values)
    ? values
        .map(relationID)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    : []

async function state(
  req: PayloadRequest,
  id: number,
  data: { sealed?: boolean; public?: boolean },
) {
  // These two derived flags are owned exclusively by the entry transaction.
  // Never pass caller-controlled content through this internal adapter operation.
  await req.payload.db.updateOne({ collection: 'content-lists', id, data, req })
}

export const prepareEntryLists: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data
  await lockPublishedContent(req)
  if (operation === 'update' && originalDoc?.id) {
    const current = await req.payload.findByID({
      collection: 'entries',
      id: originalDoc.id,
      draft: false,
      overrideAccess: true,
      req,
      depth: 0,
    })
    req.context[`previousLists:${originalDoc.id}`] = listIDs(current.contentLists)
  }
  if (
    operation === 'create' &&
    (data.contentLists == null ||
      (Array.isArray(data.contentLists) && data.contentLists.length === 0))
  ) {
    const first = await req.payload.create({
      collection: 'content-lists',
      data: { title: 'Primary content', key: randomUUID(), presentation: 'flow', items: [] },
      overrideAccess: true,
      req,
    })
    data.contentLists = [first.id]
  }
  const refs = data.contentLists === undefined ? originalDoc?.contentLists : data.contentLists
  const ids = listIDs(refs)
  if (
    !ids.length ||
    !Array.isArray(refs) ||
    ids.length !== refs.length ||
    new Set(ids).size !== ids.length
  )
    throw new APIError('An entry requires its primary content list. Lists cannot be repeated.', 400)
  const keys = new Set<string>()
  for (const id of ids) {
    const list = await req.payload.findByID({
      collection: 'content-lists',
      id,
      overrideAccess: true,
      req,
      depth: 0,
    })
    if (keys.has(list.key))
      throw new APIError('An entry cannot contain two revisions of the same list.', 400)
    keys.add(list.key)
    if (!list.sealed) await state(req, id, { sealed: true })
  }
  data.contentLists = ids
  return data
}

async function reconcile(req: PayloadRequest, ids: number[]) {
  for (const id of new Set(ids)) {
    const used = await req.payload.count({
      collection: 'entries',
      req,
      overrideAccess: true,
      where: {
        and: [
          { _status: { equals: 'published' } },
          { visibility: { equals: 'public' } },
          { contentLists: { contains: id } },
        ],
      },
    })
    await state(req, id, { public: used.totalDocs > 0 })
  }
}
export const reconcileEntryLists: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (req.context['draftSave:entries'] === true) return doc
  const previous = req.context[`previousLists:${doc.id}`] as number[] | undefined
  await reconcile(req, [
    ...(previous || listIDs(previousDoc?.contentLists)),
    ...listIDs(doc.contentLists),
  ])
  return doc
}
export const reconcileDeletedEntry: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await lockPublishedContent(req)
  await reconcile(req, listIDs(doc.contentLists))
  return doc
}

export const forkListEndpoint: Endpoint = {
  path: '/:id/revise',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ error: 'Sign in to edit content.' }, { status: 401 })
    const source = await req.payload.findByID({
      collection: 'content-lists',
      id: Number(req.routeParams?.id),
      user: req.user,
      overrideAccess: false,
      depth: 0,
    })
    const revision = await req.payload.create({
      collection: 'content-lists',
      data: copyList(source),
      user: req.user,
      overrideAccess: false,
      depth: 0,
    })
    return Response.json(revision, { status: 201 })
  },
}
