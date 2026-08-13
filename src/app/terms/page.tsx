import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Terms of Service, Portal Astra',
  description: 'The terms that govern your use of Portal Astra and Astra Premium.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms of Service, Portal Astra', url: '/terms', type: 'website' },
}

export default function TermsPage() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.pageTitle}>Terms of Service</h1>

        <div className={styles.card}>
          <p className={styles.legalDate}>Last updated: 13 August 2026</p>

          <p className={styles.infoText}>
            These terms govern your use of Portal Astra (portalastra.com), operated by Samuel
            Boadu Kofi Gyimah, trading as Portal Astra, ABN 65 246 763 997, as a sole trader in
            Australia. By
            using the site, you agree to these terms.
          </p>

          <h2 className={styles.legalH}>What Portal Astra is</h2>
          <p className={styles.infoText}>
            Portal Astra provides space and astrology content, moon phase data, horoscopes, tarot
            readings, numerology, and related material, for entertainment and personal reflection.
            A free tier is available to everyone. Astra Premium is a paid subscription unlocking
            additional content.
          </p>

          <h2 className={styles.legalH}>Entertainment purposes only</h2>
          <p className={styles.infoText}>
            The astrology, tarot, numerology, and ritual content on this site is offered for
            entertainment and personal reflection. It is not professional advice of any kind,
            including financial, medical, psychological, or legal advice. Decisions you make in
            your life are your own responsibility, not ours.
          </p>

          <h2 className={styles.legalH}>Astra Premium subscription</h2>
          <p className={styles.infoText}>
            <strong>Price.</strong> Astra Premium is currently AUD $7.95 per month, billed on a
            recurring basis until you cancel. This founder price is locked in for as long as you
            remain continuously subscribed.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Cancellation.</strong> You can cancel at any time. After cancelling, your
            access to premium content on devices you have already unlocked may continue for a short
            period, up to 7 days, before it expires. You will not be charged again after
            cancelling.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Refunds.</strong> If you are not satisfied with Astra Premium, contact us
            within 30 days of your first payment at theportalastra@gmail.com and we will refund you
            in full.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Changes to price or features.</strong> If we ever change the price or what is
            included in Astra Premium, we will give existing subscribers reasonable notice before
            the change takes effect for them.
          </p>

          <h2 className={styles.legalH}>Acceptable use</h2>
          <p className={styles.infoText}>You agree not to:</p>
          <ul className={styles.legalList}>
            <li>Attempt to access another person&apos;s account or subscription</li>
            <li>Use automated tools to scrape, overload, or abuse the site</li>
            <li>Use the site for any unlawful purpose</li>
          </ul>

          <h2 className={styles.legalH}>Intellectual property</h2>
          <p className={styles.infoText}>
            The content on Portal Astra, including written content, generated ritual prompts, and
            site design, belongs to us or our licensors. You may not republish or resell it without
            permission. You are welcome to share individual pages via the share links provided on
            the site.
          </p>

          <h2 className={styles.legalH}>No warranty</h2>
          <p className={styles.infoText}>
            We do our best to keep Portal Astra accurate and running smoothly, and we source our
            astronomical data from NASA&apos;s public APIs. However, the site is provided as is,
            without any guarantee that it will be error-free, uninterrupted, or perfectly accurate
            at all times.
          </p>

          <h2 className={styles.legalH}>Limitation of liability</h2>
          <p className={styles.infoText}>
            To the extent permitted by Australian law, we are not liable for any indirect or
            consequential loss arising from your use of the site. Nothing in these terms limits any
            consumer guarantee you are entitled to under the Australian Consumer Law that cannot
            lawfully be excluded.
          </p>

          <h2 className={styles.legalH}>Governing law</h2>
          <p className={styles.infoText}>
            These terms are governed by the laws of New South Wales, Australia.
          </p>

          <h2 className={styles.legalH}>Changes to these terms</h2>
          <p className={styles.infoText}>
            We may update these terms from time to time. If we make a material change, we will note
            it on the site. Continuing to use Portal Astra after a change means you accept the
            updated terms.
          </p>

          <h2 className={styles.legalH}>Contact</h2>
          <p className={styles.infoText}>theportalastra@gmail.com</p>
        </div>
      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
