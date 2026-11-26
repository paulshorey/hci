import type { ContentList } from '@multimedia/cms/types'
import { ContentBlock } from './Content'
import { Slideshow } from './Slideshow'

export function ContentLists({ lists, preview }: { lists: ContentList[]; preview: boolean }) {
  return lists.map((list, position) => {
    const items = list.items || []
    const content = items.map((item) => ({
      id: `${list.key}-${item.key}`,
      title: item.title || '',
      layout: item.layout,
      content: (item.content || []).map((block, index) => (
        <ContentBlock key={block.id || index} block={block} preview={preview} />
      )),
    }))
    if (!content.length) return null
    if (list.presentation === 'carousel')
      return <Slideshow key={list.id} listKey={list.key} slides={content} />
    return (
      <section
        key={list.id}
        className={`content-list content-list-${list.presentation}`}
        aria-label={position === 0 ? 'Primary content' : list.title || 'Additional content'}
      >
        {position > 0 && list.title && <h2>{list.title}</h2>}
        {content.map((item) => (
          <section key={item.id} id={`slide-${item.id}`} className={`slide layout-${item.layout}`}>
            {item.title && <h2>{item.title}</h2>}
            <div className="slide-content">{item.content}</div>
          </section>
        ))}
      </section>
    )
  })
}
