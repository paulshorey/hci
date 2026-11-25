'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

type CarouselHistory = Record<string, unknown> & {
  multimediaSlides?: { page: string; selections: Record<string, string> }
}

const slideListeners = new Set<() => void>()
let previousPage = ''
let previousHistory: CarouselHistory | null = null

function syncSlideHistory() {
  const { history, location } = window
  const page = location.pathname + location.search
  const state = history.state as CarouselHistory | null
  if (state?.multimediaSlides?.page !== page) {
    // Native fragment navigation creates an entry with no state. Carry the current
    // selections into it, then update the carousel targeted by the fragment.
    const previous = page === previousPage ? previousHistory : null
    const selections = location.hash ? { ...previous?.multimediaSlides?.selections } : {}
    const linked = document.getElementById(location.hash.slice(1))
    if (linked?.id.startsWith('slide-')) {
      const listId = linked.closest<HTMLElement>('[data-multimedia-carousel]')?.dataset
        .multimediaCarousel
      if (listId) selections[listId] = linked.id.slice('slide-'.length)
    }
    history.replaceState({ ...(state ?? previous), multimediaSlides: { page, selections } }, '')
  }
  previousPage = page
  previousHistory = history.state
  slideListeners.forEach((listener) => listener())
}

function subscribeToSlides(listener: () => void) {
  slideListeners.add(listener)
  if (slideListeners.size === 1) {
    window.addEventListener('popstate', syncSlideHistory)
    window.addEventListener('hashchange', syncSlideHistory)
    syncSlideHistory()
  }
  return () => {
    slideListeners.delete(listener)
    if (slideListeners.size === 0) {
      window.removeEventListener('popstate', syncSlideHistory)
      window.removeEventListener('hashchange', syncSlideHistory)
      previousHistory = null
    }
  }
}

export function Slideshow({
  listId,
  slides,
}: {
  listId: number
  slides: { id: string; title: string; layout: string; content: ReactNode }[]
}) {
  const selectedId = useSyncExternalStore(
    subscribeToSlides,
    () => {
      const { history, location } = window
      const stored = (history.state as CarouselHistory | null)?.multimediaSlides
      return stored?.page === location.pathname + location.search
        ? stored.selections[listId]
        : undefined
    },
    () => undefined,
  )
  const [all, setAll] = useState(false)
  const root = useRef<HTMLElement>(null)
  const index = Math.max(
    0,
    slides.findIndex((slide) => slide.id === selectedId),
  )

  useEffect(() => {
    root.current?.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
      if (all || media.closest('[hidden]')) media.pause()
    })
  }, [index, all])
  if (!slides.length) return null
  const go = (next: number) => {
    if (next >= 0 && next < slides.length) window.location.hash = `slide-${slides[next].id}`
  }
  return (
    <section
      ref={root}
      className="slideshow"
      data-multimedia-carousel={listId}
      aria-label="Multimedia slideshow"
      aria-roledescription={all ? undefined : 'carousel'}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement
        if (
          all ||
          target.closest('input, textarea, select, video, audio, iframe, [contenteditable]')
        )
          return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          go(index - 1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          go(index + 1)
        }
        if (event.key === 'Home') {
          event.preventDefault()
          go(0)
        }
        if (event.key === 'End') {
          event.preventDefault()
          go(slides.length - 1)
        }
      }}
    >
      <div className="slide-toolbar">
        <div>
          <span className="eyebrow">Evidence collection</span>
          <span className="slide-count" aria-live="polite">
            {all ? `${slides.length} slides` : `${index + 1} / ${slides.length}`}
          </span>
        </div>
        <div className="slide-actions">
          <button onClick={() => setAll(!all)} aria-pressed={all}>
            {all ? 'Slideshow' : 'Read all'}
          </button>
          {!all && (
            <>
              <button
                onClick={() => go(index - 1)}
                disabled={index === 0}
                aria-label="Previous slide"
              >
                ←
              </button>
              <button
                onClick={() => go(index + 1)}
                disabled={index === slides.length - 1}
                aria-label="Next slide"
              >
                →
              </button>
            </>
          )}
        </div>
      </div>
      <div
        tabIndex={0}
        className="slides"
        aria-label="Use left and right arrows to change slides"
        onTouchStart={(event) => {
          root.current!.dataset.touchX = String(event.changedTouches[0].clientX)
        }}
        onTouchEnd={(event) => {
          const target = event.target as HTMLElement
          if (all || target.closest('video, audio, iframe, a, button')) return
          const start = Number(root.current?.dataset.touchX)
          const delta = event.changedTouches[0].clientX - start
          if (Math.abs(delta) > 80) go(index + (delta < 0 ? 1 : -1))
        }}
      >
        {slides.map((slide, position) => (
          <article
            key={slide.id}
            id={`slide-${slide.id}`}
            hidden={!all && index !== position}
            className={`slide layout-${slide.layout}`}
            aria-label={`${position + 1} of ${slides.length}: ${slide.title}`}
          >
            <div className="slide-heading">
              <h2>{slide.title}</h2>
              <a
                className="permalink"
                href={`#slide-${slide.id}`}
                aria-label={`Link to slide ${position + 1}`}
              >
                #
              </a>
            </div>
            <div className="slide-content">{slide.content}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
