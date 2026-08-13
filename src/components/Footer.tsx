'use client'

import Link from 'next/link'
import ShareButtons from './ShareButtons'
import styles from './Footer.module.css'

// Shared site footer. The share row is the site's single ShareButtons
// component (see src/components/ShareButtons.tsx); pages parameterise it by
// passing shareText / shareImage, and it reads the live URL itself.
export default function Footer({
  title = 'Portal Astra',
  shareText,
  shareImage,
}: {
  title?: string
  shareText?: string
  shareImage?: string
}) {
  return (
    <footer className={styles.footer}>
      <ShareButtons title={shareText || title} image={shareImage} className={styles.shareRow} />

      <nav className={styles.links}>
        <Link href="/" className={styles.link}>Home</Link>
        <span className={styles.sep}>·</span>
        <Link href="/blog" className={styles.link}>Blog</Link>
        <span className={styles.sep}>·</span>
        <Link href="/moon" className={styles.link}>Moon</Link>
        <span className={styles.sep}>·</span>
        <Link href="/about" className={styles.link}>About</Link>
        <span className={styles.sep}>·</span>
        <Link href="/privacy" className={styles.link}>Privacy</Link>
        <span className={styles.sep}>·</span>
        <Link href="/terms" className={styles.link}>Terms</Link>
        <span className={styles.sep}>·</span>
        <a href="mailto:theportalastra@gmail.com" className={styles.link}>theportalastra@gmail.com</a>
      </nav>

      <p className={styles.attribution}>Astronomy data: NASA Open APIs (APOD, NeoWs, DONKI, EPIC) · Horoscope: third-party astrology feed</p>
      <p className={styles.attribution}>Horoscope, tarot, and spiritual content is for entertainment and personal reflection only.</p>
      <p className={styles.copyright}>© 2026 Portal Astra. All rights reserved.</p>
    </footer>
  )
}
