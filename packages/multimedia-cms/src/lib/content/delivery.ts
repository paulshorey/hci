import type { Entry, ContentList } from '../../generated/payload-types'
export function entryLists(entry: Entry): ContentList[] {
  return entry.contentLists.filter(
    (value): value is ContentList => typeof value === 'object' && value !== null,
  )
}
export const itemCount = (lists: ContentList[]) =>
  lists.reduce((count, list) => count + (list.items?.length || 0), 0)
export function firstImage(entry: Entry) {
  return entryLists(entry)[0]
    ?.items?.flatMap((item) => item.content || [])
    .find((block) => block.blockType === 'image')
}
