import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FormState } from 'payload'
import { fieldReducer } from '../../node_modules/@payloadcms/ui/dist/forms/Form/fieldReducer.js'

test('a late form response schedules initialization for a row added while it was pending', () => {
  const requested: FormState = {
    title: { value: 'Typed title', initialValue: 'Original title' },
    items: { value: 0, rows: [] },
  }
  const local = fieldReducer(requested, { type: 'ADD_ROW', path: 'items', rowIndex: 0 })
  const previous = { current: requested }
  const merged = fieldReducer(local, {
    type: 'MERGE_SERVER_STATE',
    prevStateRef: previous,
    serverState: requested,
  })
  assert.equal(merged.items.rows?.length, 1)
  assert.equal(merged.items.rows?.[0].isLoading, true)
  assert.equal(merged.title.value, 'Typed title')
  // Form's debounce must see work left to do after the stale response arrives.
  assert.notDeepEqual(previous.current, merged)

  const id = merged.items.rows![0].id
  const initialized = fieldReducer(merged, {
    type: 'MERGE_SERVER_STATE',
    prevStateRef: previous,
    serverState: {
      ...requested,
      items: { value: 1, rows: [{ id, isLoading: false }] },
      'items.0.title': { value: '', addedByServer: true },
    },
  })
  assert.equal(initialized.items.rows?.[0].isLoading, false)
  assert.equal(initialized.title.value, 'Typed title')
  assert.deepEqual(previous.current, initialized)
})
