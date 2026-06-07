import type { Metadata } from 'next'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Lost in space — Portal Astra',
  description: 'This corner of the cosmos is empty.',
}

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.logo} aria-label="Portal Astra">
              PORTAL<span className={styles.dot}>·</span>ASTRA
            </h1>
            <p className={styles.tagline}>404 · Lost in space</p>
          </div>
        </header>

        <div className={styles.card} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ fontSize: '3.5rem', margin: '0 0 1rem' }}>🌌</p>
          <h2 className={styles.notFoundTitle}>This corner of the cosmos is empty</h2>
          <p className={styles.infoText} style={{ maxWidth: '40ch', margin: '0.75rem auto 1.75rem' }}>
            The page you were looking for has drifted beyond the observable universe.
          </p>
          <Link href="/" className={styles.notFoundLink}>← Return to Portal Astra</Link>
        </div>
      </div>
    </main>
  )
}
