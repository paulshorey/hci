import { randomUUID } from 'node:crypto'
import type { ContentList } from '../../generated/payload-types'
export function newListData(
  value: {
    title?: string
    key?: string
    presentation?: ContentList['presentation']
    items?: (Omit<NonNullable<ContentList['items']>[number], 'id' | 'key' | 'layout'> & {
      key?: string
      layout?: 'stacked' | 'comparison'
    })[]
  } = {},
) {
  return {
    title: value.title || 'Content',
    key: value.key || randomUUID(),
    presentation: value.presentation || 'flow',
    items: (value.items || []).map((item) => ({
      ...item,
      layout: item.layout || 'stacked',
      key: item.key || randomUUID(),
    })),
  }
}
