'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, useConfig, useDocumentDrawer, useField } from '@payloadcms/ui'
import type { RelationshipFieldClientComponent } from 'payload'
import { copyList } from '../lib/content/revisions'
import type { ContentList } from '../generated/payload-types'

type Edit = { index: number; initialData: Record<string, unknown> }
const presentationLabels = {
  flow: 'Continuous content',
  carousel: 'Carousel',
  list: 'List',
  grid: 'Grid',
}
function RevisionDrawer({
  edit,
  save,
  close,
}: {
  edit: Edit
  save: (id: number) => void
  close: () => void
}) {
  const [Drawer, , { openDrawer, closeDrawer, isDrawerOpen }] = useDocumentDrawer({
    collectionSlug: 'content-lists',
    overrideEntityVisibility: true,
  })
  const opened = useRef(false)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      openDrawer()
    }
  }, [openDrawer])
  const wasOpen = useRef(false)
  useEffect(() => {
    if (isDrawerOpen) wasOpen.current = true
    else if (wasOpen.current) close()
  }, [isDrawerOpen, close])
  return (
    <Drawer
      initialData={edit.initialData}
      onSave={({ doc }) => {
        save(Number(doc.id))
        closeDrawer()
        close()
      }}
    />
  )
}
export const ContentListsField: RelationshipFieldClientComponent = ({ path, readOnly }) => {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const base = `${serverURL || ''}${api}`
  const { value, setValue, errorMessage, showError } = useField<number[]>({ path })
  const ids = Array.isArray(value)
    ? value.map((v) => (typeof v === 'object' && v ? Number((v as { id: number }).id) : Number(v)))
    : []
  const [docs, setDocs] = useState<Record<number, ContentList>>({})
  const [editing, setEditing] = useState<Edit | null>(null)
  const [error, setError] = useState('')
  const close = useCallback(() => setEditing(null), [setEditing])
  const signature = ids.join(',')
  useEffect(() => {
    let active = true
    Promise.all(
      ids.map(async (id) => {
        const response = await fetch(`${base}/content-lists/${id}?depth=0`)
        if (!response.ok) throw new Error('Could not load content. Reload the entry and try again.')
        return [id, await response.json()] as const
      }),
    )
      .then((rows) => {
        if (active) {
          setDocs(Object.fromEntries(rows))
          setError('')
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
    // The signature represents the ordered relationship value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, signature])
  const edit = (index: number) => {
    setError('')
    const source = docs[ids[index]]
    setEditing({
      index,
      initialData: source
        ? copyList(source)
        : {
            title: index === 0 ? 'Primary content' : 'Additional content',
            presentation: index === 0 ? 'flow' : 'carousel',
            items: [],
          },
    })
  }
  const save = (id: number) => {
    const next = [...ids]
    if (editing) next[editing.index] = id
    setValue(next)
  }
  const move = (index: number, direction: number) => {
    const next = [...ids]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    setValue(next)
  }
  const card = (index: number) => {
    const doc = docs[ids[index]]
    const count = doc?.items?.length || 0
    const title = index === 0 ? 'Primary content' : doc?.title || 'Additional content'
    return (
      <div
        key={ids[index] || 'primary'}
        role="group"
        aria-label={title}
        style={{
          border: '1px solid var(--theme-elevation-200)',
          borderRadius: 5,
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <strong>{title}</strong>
        <p>
          {doc
            ? `${count} ${count === 1 ? 'item' : 'items'} · ${presentationLabels[doc.presentation]}`
            : 'Add text, images, videos, links, files or interactive content. You may also leave this empty.'}
        </p>
        {!readOnly && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button
              buttonStyle="secondary"
              size="small"
              type="button"
              disabled={Boolean(ids[index]) && !doc}
              onClick={() => edit(index)}
            >
              {doc ? 'Edit content' : 'Add content'}
            </Button>
            {index > 0 && (
              <>
                <Button
                  buttonStyle="secondary"
                  size="small"
                  type="button"
                  onClick={() => setValue(ids.filter((_, i) => i !== index))}
                >
                  Remove list
                </Button>
                {index > 1 && (
                  <Button
                    buttonStyle="secondary"
                    size="small"
                    type="button"
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </Button>
                )}
                {index < ids.length - 1 && (
                  <Button
                    buttonStyle="secondary"
                    size="small"
                    type="button"
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="field-type" style={{ marginBottom: '2rem' }}>
      {card(0)}
      {ids.length > 1 && (
        <div>
          <h3>Additional content lists</h3>
          {ids.slice(1).map((_, index) => card(index + 1))}
        </div>
      )}
      {!readOnly && ids.length > 0 && (
        <Button buttonStyle="secondary" size="small" type="button" onClick={() => edit(ids.length)}>
          Add another content list
        </Button>
      )}
      {(error || showError) && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error || errorMessage}
        </p>
      )}
      {editing && <RevisionDrawer edit={editing} save={save} close={close} />}
    </div>
  )
}
