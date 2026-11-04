import type { Endpoint } from 'payload'
import { importBundle, limits, readZip } from './bundles'
import { bundleFormData, ImportRequestError } from './multipart'

export const bundleImportEndpoint: Endpoint = {
  path: '/bundle-import',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return Response.json({ error: 'Sign in to import bundles.' }, { status: 401 })
    try {
      const form = await bundleFormData(req)
      const file = form.get('file')
      const title = String(form.get('title') || '')
      const entryFile = String(form.get('entryFile') || 'index.html')
      if (!(file instanceof File) || file.size > limits.zip)
        throw new Error('Select a ZIP file up to 25 MB.')
      const files = await readZip(Buffer.from(await file.arrayBuffer()))
      const snippet = await importBundle({
        payload: req.payload,
        files,
        title,
        entryFile,
        user: req.user,
        req,
      })
      return Response.json({ id: snippet.id }, { status: 201 })
    } catch (error) {
      req.payload.logger.warn({
        msg: 'Bundle import rejected',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return Response.json(
        {
          error:
            error instanceof ImportRequestError
              ? error.message
              : 'Import failed. Check the ZIP paths, file types, size limits, and entry HTML file.',
        },
        { status: error instanceof ImportRequestError ? error.status : 400 },
      )
    }
  },
}
