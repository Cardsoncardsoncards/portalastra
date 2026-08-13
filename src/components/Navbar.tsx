'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMoonPhase, formatDateLongAEST } from '@/lib/shared'
import styles from './Navbar.module.css'

export default function Navbar() {
  // These two values are time-dependent, and the pages that render this navbar
  // are statically prerendered. Computing them during the first render would
  // bake the build date into the HTML and then disagree with the browser on
  // hydration, which is exactly the mismatch this strip used to produce.
  // Filling them in after mount means server and client always render the
  // same initial markup, and the visitor then sees the live AEST values.
  const [strip, setStrip] = useState<{ date: string; emoji: string; name: string } | null>(null)

  useEffect(() => {
    const phase = getMoonPhase()
    setStrip({ date: formatDateLongAEST(), emoji: phase.emoji, name: phase.name })
  }, [])

  return (
    <nav className={styles.navbar} aria-label="Primary">
      <div className={styles.navTop}>
        <Link href="/" className={styles.brand} aria-label="Portal Astra home">
          <span className={styles.logoText}>PORTAL ASTRA</span>
        </Link>
        <span className={styles.tagline}>Where science meets the stars</span>
        <div className={styles.divider}></div>
        <div className={styles.links}>
          <Link href="/" className={styles.link}>Home</Link>
          <Link href="/blog" className={styles.link}>Blog</Link>
          <Link href="/moon" className={styles.link}>Moon</Link>
          <Link href="/calendars" className={styles.link}>Calendars</Link>
          <Link href="/pricing" className={styles.link}>Pricing</Link>
          <Link href="/about" className={styles.link}>About</Link>
        </div>
      </div>
      <div className={styles.navStrip}>
        <div className={styles.stripDate}>
          <span className={styles.stripDateLabel}>Date</span>
          <span className={styles.stripDateValue}>{strip ? strip.date : ' '}</span>
        </div>
        <span className={styles.stripStar}>✦</span>
        <Link href="/moon" className={styles.stripItem}>
          <span>{strip ? `${strip.emoji} ${strip.name}` : ' '}</span>
        </Link>
        <span className={styles.stripStar}>✦</span>
        <Link href="/nasa-data" className={styles.stripItem}>Live NASA Data</Link>
      </div>
    </nav>
  )
}
