'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './Footer.module.css'

// Shared site footer with share buttons that point at the current URL.
export default function Footer({ title = 'Portal Astra', shareText }: { title?: string; shareText?: string }) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const text = shareText || title

  // Read the live URL only on the client to avoid an SSR/hydration mismatch.
  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.shareRow}>
        <a
          className={styles.shareBtn}
          href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
        <a
          className={styles.shareBtn}
          href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          X
        </a>
        <a
          className={styles.shareBtn}
          href={`https://wa.me/?text=${enc(text)}%20${enc(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <a
          className={styles.shareBtn}
          href={`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Reddit
        </a>
        <a
          className={styles.shareBtn}
          href={`https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Pinterest
        </a>
        <a
          className={styles.shareBtn}
          href="https://www.instagram.com/portalastra"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
        <button className={styles.shareBtn} onClick={copy}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

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
      </nav>

      <p className={styles.copyright}>© 2026 Portal Astra. All rights reserved.</p>
    </footer>
  )
}
