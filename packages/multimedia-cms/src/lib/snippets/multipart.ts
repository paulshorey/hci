import { limits } from './bundles'

export class ImportRequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message)
  }
}

export async function bundleFormData(
  req: Pick<Request, 'headers'> & Partial<Pick<Request, 'body'>>,
): Promise<FormData> {
  const max = limits.zip + 1024 * 1024
  if (Number(req.headers.get('content-length') || 0) > max)
    throw new ImportRequestError('ZIP exceeds the 25 MiB upload limit.', 413)
  const reader = req.body?.getReader()
  if (!reader) throw new ImportRequestError('Choose a ZIP file to import.')
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > max) {
        await reader.cancel()
        throw new ImportRequestError('ZIP exceeds the 25 MiB upload limit.', 413)
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': req.headers.get('content-type') || '' },
    }).formData()
  } catch {
    throw new ImportRequestError('Send the ZIP using the import form.')
  }
}
