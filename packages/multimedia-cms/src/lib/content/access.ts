import type { Access, FieldAccess } from 'payload'

export const editor: Access = ({ req }) => Boolean(req.user)
export const admin: Access = ({ req }) => req.user?.role === 'admin'
export const adminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
export const published: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
export const publicMedia: Access = ({ req }) =>
  req.user ? true : { visibility: { equals: 'public' } }

export const editorialAccess = {
  read: published,
  create: editor,
  update: editor,
  delete: admin,
  readVersions: editor,
}
