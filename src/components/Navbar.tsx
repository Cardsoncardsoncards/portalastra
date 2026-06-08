import Link from 'next/link'
import Image from 'next/image'
import styles from './Navbar.module.css'

// Shared top navigation used on every page. No hooks, so it works inside
// both server and client component trees.
export default function Navbar() {
  return (
    <nav className={styles.navbar} aria-label="Primary">
      {/* Left: logo */}
      <Link href="/" className={styles.brand} aria-label="Portal Astra home">
        <Image
          src="/images/portal-astra-logo-horizontal.png"
          alt="Portal Astra"
          width={520}
          height={140}
          className={styles.logoImg}
          priority
        />
      </Link>

      {/* Center: tagline */}
      <div className={styles.tagline}>Where science meets the stars</div>

      {/* Right: links */}
      <div className={styles.links}>
        <Link href="/" className={styles.link}>Home</Link>
        <Link href="/blog" className={styles.link}>Blog</Link>
        <Link href="/about" className={styles.link}>About</Link>
      </div>
    </nav>
  )
}
