import { cms } from '@/lib/content/queries'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    await (await cms()).count({ collection: 'entries', overrideAccess: false })
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
