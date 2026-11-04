import type { ContentList } from '../../generated/payload-types'

// Payload row IDs are SQL identities; content keys preserve anchors across revisions.
export function copyList(source: ContentList) {
  const strip = (value: unknown): unknown =>
    value && typeof value === 'object' && 'id' in value && 'createdAt' in value
      ? value.id
      : Array.isArray(value)
        ? value.map(strip)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .filter(
                  ([key]) =>
                    key !== 'id' ||
                    !('blockType' in value || ('key' in value && 'layout' in value)),
                )
                .map(([key, item]) => [key, strip(item)]),
            )
          : value
  return {
    title: source.title,
    key: source.key,
    presentation: source.presentation,
    items: strip(source.items || []) as ContentList['items'],
  }
}
