export function relationID(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID(value.id)
  return null
}

export function externalVideo(value: string): { kind: 'file' | 'iframe'; url: string } | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    let id: string | null = null
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/shorts\/([\w-]+)$/)?.[1] || null
    } else if (url.hostname === 'youtu.be') id = url.pathname.slice(1)
    if (id && /^[\w-]{11}$/.test(id))
      return { kind: 'iframe', url: `https://www.youtube-nocookie.com/embed/${id}` }
    if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname) && /^\/\d+$/.test(url.pathname))
      return { kind: 'iframe', url: `https://player.vimeo.com/video/${url.pathname.slice(1)}` }
    if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: 'file', url: url.href }
    return null
  } catch {
    return null
  }
}
