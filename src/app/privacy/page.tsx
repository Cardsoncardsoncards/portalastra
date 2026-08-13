import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy, Portal Astra',
  description: 'How Portal Astra collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy, Portal Astra', url: '/privacy', type: 'website' },
}

const SHARING = [
  {
    service: 'Stripe',
    receives: 'Email, payment details',
    purpose: 'Processing your subscription payment',
    location: 'United States / Ireland',
  },
  {
    service: 'MailerLite',
    receives: 'Email address',
    purpose: 'Sending the newsletter and account emails',
    location: 'European Union / United States',
  },
  {
    service: 'Resend',
    receives: 'Email address, one-time unlock link',
    purpose: 'Sending premium unlock links',
    location: 'Japan (infrastructure)',
  },
  {
    service: 'Google Analytics',
    receives: 'Anonymised usage data',
    purpose: 'Understanding site traffic',
    location: 'United States',
  },
  {
    service: 'Amazon Associates',
    receives: 'No personal data',
    purpose: 'Affiliate product links',
    location: 'United States',
  },
  {
    service: 'Supabase',
    receives: 'Email (hashed unlock tokens only), no birth dates',
    purpose: 'Storing unlock tokens and cached product data',
    location: 'South Korea',
  },
  {
    service: 'Netlify',
    receives: 'Server logs, may briefly include email in error logs',
    purpose: 'Hosting the website',
    location: 'United States',
  },
]

export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.pageTitle}>Privacy Policy</h1>

        <div className={styles.card}>
          <p className={styles.legalDate}>Last updated: 14 August 2026</p>

          <h2 className={styles.legalH}>Who we are</h2>
          <p className={styles.infoText}>
            Portal Astra (portalastra.com) is operated by Voxsanity Pty Ltd, ABN
            82 700 348 867. You can contact us at theportalastra@gmail.com for any
            privacy question or request.
          </p>

          <h2 className={styles.legalH}>What we collect</h2>
          <p className={styles.infoText}>
            <strong>Email address.</strong> Collected when you subscribe to the newsletter, when
            you sign up for the premium waitlist, or when you request an unlock link for Astra
            Premium. Used to send you the content you signed up for and to verify your
            subscription status.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Payment details.</strong> If you subscribe to Astra Premium, your payment is
            processed directly by Stripe. We never see or store your full card details. We receive
            your email address and subscription status from Stripe so we can grant you access to
            premium content.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Birth date.</strong> If you use the Life Path number calculator on the homepage
            or on the Calendars page, the date you enter is used only inside your own browser to
            compute a number. It is never sent to us, never stored, and never leaves your device.
          </p>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            <strong>Usage data.</strong> We use Google Analytics (GA4) to understand how visitors
            use the site, pages viewed, general location, device type. This is aggregate, not tied
            to your name unless you are separately logged into a Google account that Google itself
            associates with that activity, which is outside our control.
          </p>

          <h2 className={styles.legalH}>Cookies and browser storage</h2>
          <p className={styles.infoText}>We use the following:</p>
          <ul className={styles.legalList}>
            <li>
              <strong>Google Analytics cookies</strong>, to measure site usage. These can be
              blocked using your browser&apos;s cookie settings or an ad blocker without affecting
              your ability to use the site.
            </li>
            <li>
              <strong>An unlock session cookie</strong>, set only if you subscribe to Astra Premium
              and use the unlock link, so your browser remembers you have access. This cookie is
              not readable by any script on the page, only by our own server, and expires
              automatically after 7 days.
            </li>
            <li>
              <strong>A small amount of local browser storage</strong>, for preferences like your
              saved zodiac sign and whether you have dismissed a one-time notice. This stays on
              your device and is never transmitted to us.
            </li>
          </ul>

          <h2 className={styles.legalH}>Who we share data with</h2>
          <p className={styles.infoText}>
            We use the following third-party services to run Portal Astra. Each receives only what
            it needs to do its job.
          </p>
          <div className={styles.legalTableWrap}>
            <table className={styles.legalTable}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>What it receives</th>
                  <th>Purpose</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {SHARING.map((row) => (
                  <tr key={row.service}>
                    <td>{row.service}</td>
                    <td>{row.receives}</td>
                    <td>{row.purpose}</td>
                    <td>{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.infoText} style={{ marginTop: '1rem' }}>
            We do not sell your data to anyone, for any reason.
          </p>

          <h2 className={styles.legalH}>Overseas disclosure</h2>
          <p className={styles.infoText}>
            Because the services above are based overseas, your personal information, principally
            your email address, is disclosed to recipients outside Australia as listed in the
            table. We choose providers with their own privacy and security commitments, but we are
            not able to guarantee the specific privacy laws of every country a provider operates in
            match Australian standards exactly. If you have concerns about this, contact us and we
            can discuss what alternatives exist.
          </p>

          <h2 className={styles.legalH}>How long we keep your data</h2>
          <p className={styles.infoText}>
            We keep your email address for as long as you remain subscribed to our newsletter or
            Astra Premium. Unlock tokens expire automatically after 20 minutes whether used or not,
            and used or expired tokens are periodically deleted. If you unsubscribe or cancel your
            subscription, we remove you from active MailerLite sending groups. If you would like
            your data deleted entirely rather than just unsubscribed, see below.
          </p>

          <h2 className={styles.legalH}>Your rights</h2>
          <p className={styles.infoText}>You can ask us to:</p>
          <ul className={styles.legalList}>
            <li>Tell you what personal information we hold about you</li>
            <li>Correct any information that is wrong</li>
            <li>Delete your information entirely</li>
          </ul>
          <p className={styles.infoText} style={{ marginTop: '0.75rem' }}>
            To do any of these, email theportalastra@gmail.com. We will confirm your request and
            complete it within 30 days, which may involve removing your details from MailerLite,
            our Supabase database, and asking our other providers to do the same where applicable.
            We will let you know once it is done.
          </p>

          <h2 className={styles.legalH}>Children&apos;s privacy</h2>
          <p className={styles.infoText}>
            Portal Astra is intended for a general adult audience and is not directed at children.
            We do not knowingly collect personal information from anyone under 18. If you believe a
            child has provided us with personal information, contact us and we will remove it.
          </p>

          <h2 className={styles.legalH}>Changes to this policy</h2>
          <p className={styles.infoText}>
            If we change what we collect or how we use it, we will update this page and change the
            date at the top. If the change is significant, we will also note it on the homepage.
          </p>

          <h2 className={styles.legalH}>Contact</h2>
          <p className={styles.infoText}>theportalastra@gmail.com</p>
        </div>
      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
