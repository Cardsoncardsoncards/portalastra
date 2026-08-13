import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy, Portal Astra',
  description: 'How Portal Astra collects, uses, and protects your information.',
}

// NOTE: This is a sensible default policy reflecting what the site actually
// does (NASA API data, email capture via MailerLite, local browser storage).
// Replace the copy below with your own legally reviewed text if required.
export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.pageTitle}>Privacy Policy</h1>

        <div className={styles.card}>
          <p className={styles.legalDate}>Last updated: 7 June 2026</p>

          <p className={styles.infoText}>
            Portal Astra (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what
            information we collect, how we use it, and the choices you have. By using
            portalastra.com you agree to the practices described here.
          </p>

          <h2 className={styles.legalH}>Information we collect</h2>
          <p className={styles.infoText}>
            <strong>Email address.</strong> If you subscribe to our weekly newsletter, we collect the
            email address you provide so we can send you updates. We do not require any other personal
            details to use the site.
          </p>
          <p className={styles.infoText}>
            <strong>Local preferences.</strong> Your chosen star sign and similar preferences are stored
            in your browser&apos;s local storage on your own device. This data never leaves your device
            and is not transmitted to us.
          </p>
          <p className={styles.infoText}>
            <strong>Birth date for numerology.</strong> Any birth date you enter into the life-path
            calculator is used only in your browser to compute a number and is never sent to or stored by us.
          </p>

          <h2 className={styles.legalH}>How we use your information</h2>
          <p className={styles.infoText}>
            We use your email address solely to deliver the newsletter you signed up for and, where
            relevant, service messages about it. We do not sell your personal information.
          </p>

          <h2 className={styles.legalH}>Third-party services</h2>
          <p className={styles.infoText}>
            <strong>MailerLite.</strong> Newsletter subscriptions are managed through MailerLite, which
            stores your email on our behalf and is subject to its own privacy policy.
          </p>
          <p className={styles.infoText}>
            <strong>NASA Open APIs.</strong> Astronomy content (imagery, near-Earth objects, space
            weather) is retrieved from NASA&apos;s public APIs. These requests are made from our servers
            and do not transmit your personal information.
          </p>

          <h2 className={styles.legalH}>Cookies and tracking</h2>
          <p className={styles.infoText}>
            Portal Astra does not use advertising or cross-site tracking cookies. The only browser
            storage we rely on is the local preference data described above.
          </p>

          <h2 className={styles.legalH}>Your choices</h2>
          <p className={styles.infoText}>
            You can unsubscribe from the newsletter at any time using the link in every email. You can
            clear locally stored preferences by clearing your browser&apos;s site data. To request
            deletion of your email from our list, contact us at the address below.
          </p>

          <h2 className={styles.legalH}>Children&apos;s privacy</h2>
          <p className={styles.infoText}>
            Portal Astra is intended for a general audience and is not directed to children under 13. We
            do not knowingly collect personal information from children.
          </p>

          <h2 className={styles.legalH}>Changes to this policy</h2>
          <p className={styles.infoText}>
            We may update this policy from time to time. Material changes will be reflected by updating
            the &quot;Last updated&quot; date at the top of this page.
          </p>

          <h2 className={styles.legalH}>Contact</h2>
          <p className={styles.infoText}>
            Questions about this policy can be sent to theportalastra@gmail.com.
          </p>

          <p className={styles.infoText} style={{ marginTop: '1.5rem' }}>
            Horoscope, tarot, numerology, and other spiritual content on Portal Astra is provided for
            entertainment and personal reflection only.
          </p>
        </div>

      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
