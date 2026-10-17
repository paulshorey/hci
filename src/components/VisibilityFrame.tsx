'use client'

import { useEffect, useRef, useState } from 'react'

export function VisibilityFrame({
  src,
  title,
  height = 420,
  sandbox,
}: {
  src: string
  title: string
  height?: number
  sandbox?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), {
      rootMargin: '0px',
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="frame-shell" style={{ minHeight: height }}>
      {visible ? (
        <iframe
          src={src}
          title={title}
          height={height}
          sandbox={sandbox}
          allow="fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="frame-placeholder">{title}</span>
      )}
    </div>
  )
}
