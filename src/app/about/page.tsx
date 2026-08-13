import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.portalastra.com').replace(/\/$/, '')
const CONTACT_EMAIL = 'theportalastra@gmail.com'

export const metadata: Metadata = {
  title: 'About, Portal Astra',
  description:
    'What Portal Astra is, who built it, the NASA data sources behind it, and our editorial approach: science labelled as science, spiritual content as reflection.',
  alternates: { canonical: '/about' },
  openGraph: { title: 'About Portal Astra', url: '/about', type: 'website' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Portal Astra',
  url: SITE_URL,
  description:
    'Portal Astra is a daily cosmic dashboard pairing real NASA astronomy data with clearly-labelled astrology, tarot, numerology and other reflective content.',
  email: CONTACT_EMAIL,
  contactPoint: {
    '@type': 'ContactPoint',
    email: CONTACT_EMAIL,
    contactType: 'customer support',
  },
}

export default function AboutPage() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.pageTitle}>About Portal Astra</h1>

        <div className={styles.card}>
          <h2 className={styles.legalH} style={{ marginTop: 0 }}>What Portal Astra is</h2>
          <p className={styles.infoText}>
            Portal Astra is a daily cosmic dashboard. It brings together real astronomy, the night
            sky, the Sun&apos;s weather, the Moon&apos;s phase, the asteroids passing nearby, with the
            symbolism humans have always read into the sky: horoscopes, tarot, angel numbers and
            numerology. The idea is simple: look up, both ways. One side is observable science; the
            other is reflection and personal meaning. We keep them clearly distinct.
          </p>

          <h2 className={styles.legalH}>Who built it</h2>
          <p className={styles.infoText}>
            Portal Astra is an independent project built by a small team of sky enthusiasts who wanted
            a single calm place to check the real cosmos and enjoy its symbolism without the clutter of
            most astrology apps. It is maintained by the Portal Astra Editorial Team, who write the
            guides in our blog and curate every reading.
          </p>

          <h2 className={styles.legalH}>Where the data comes from</h2>
          <p className={styles.infoText}>
            The astronomy on Portal Astra is powered by NASA&apos;s free, public Open APIs:
          </p>
          <p className={styles.infoText}>
            <strong>APOD</strong>, the Astronomy Picture of the Day, NASA&apos;s daily featured image
            of the cosmos.<br />
            <strong>NeoWs</strong>, the Near-Earth Object Web Service, providing data on asteroids
            making close approaches to Earth.<br />
            <strong>DONKI</strong>, the Space Weather Database of Notifications, Knowledge and
            Information, tracking solar flares, coronal mass ejections and geomagnetic storms.<br />
            <strong>EPIC</strong>, the Earth Polychromatic Imaging Camera aboard the DSCOVR satellite,
            which photographs the full sunlit face of Earth from deep space.
          </p>
          <p className={styles.infoText}>
            Horoscope text is sourced from a third-party daily horoscope service, with our own static
            fallbacks. NASA does not endorse Portal Astra; we simply use its open data with gratitude.
          </p>

          <h2 className={styles.legalH}>Our editorial approach</h2>
          <p className={styles.infoText}>
            We label science as science and reflection as reflection, always. Astronomical data is
            presented factually and sourced from NASA. Horoscopes, tarot readings, angel numbers,
            life-path numbers and moon rituals are presented as entertainment and personal reflection
            only. They are not predictions, medical, legal, financial or psychological advice, and we
            say so plainly wherever they appear. Our blog explains the genuine history and, where
            relevant, the science behind each topic so you can enjoy the symbolism with eyes open.
          </p>

          <h2 className={styles.legalH}>Contact</h2>
          <p className={styles.infoText}>
            Questions, corrections or feedback are welcome at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.footerLink}>{CONTACT_EMAIL}</a>.
          </p>
        </div>

      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
