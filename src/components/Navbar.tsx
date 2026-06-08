'use client'

import Link from 'next/link'
import styles from './Navbar.module.css'

const PHASE_EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]

// Current moon phase emoji + name. Runs on the client so the strip reflects
// the visitor's current date rather than the build time.
function MoonPhaseIcon() {
  const age = ((Date.now() / 86400000) - 10592.5) % 29.53059
  const idx = ((Math.floor((age / 29.53059) * 8) % 8) + 8) % 8
  return (
    <span suppressHydrationWarning>
      {PHASE_EMOJIS[idx]} {PHASE_NAMES[idx]}
    </span>
  )
}

export default function Navbar() {
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
          <Link href="/about" className={styles.link}>About</Link>
        </div>
      </div>
      <div className={styles.navStrip}>
        <div className={styles.stripDate}>
          <span className={styles.stripDateLabel}>Today</span>
          <span className={styles.stripDateValue} suppressHydrationWarning>{new Date().toLocaleDateString('en-AU', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</span>
        </div>
        <span className={styles.stripStar}>✦</span>
        <Link href="/moon" className={styles.stripItem}>
          <MoonPhaseIcon />
        </Link>
        <span className={styles.stripStar}>✦</span>
        <Link href="/nasa-data" className={styles.stripItem}>Live NASA Data</Link>
      </div>
    </nav>
  )
}
