'use client'

import { useEffect, useState } from 'react'

// Thin 3px bar fixed at the top that fills left-to-right as the reader scrolls.
export default function ReadingProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const scrollTop = el.scrollTop || document.body.scrollTop
      const height = el.scrollHeight - el.clientHeight
      setPct(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 3,
        width: `${pct}%`,
        background: '#b8a4ff',
        zIndex: 200,
        transition: 'width 0.1s linear',
      }}
    />
  )
}
