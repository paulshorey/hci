export type * from './generated/payload-types'
import type { ContentList } from './generated/payload-types'
export type ContentItem = NonNullable<ContentList['items']>[number]
export type ContentBlock = NonNullable<ContentItem['content']>[number]
