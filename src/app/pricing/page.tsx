import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AmazonProductRow from '@/components/AmazonProductRow'
import { CheckoutBanners, CheckoutButton } from './CheckoutClient'
import {
  PREMIUM_PRICE_DISPLAY,
  PREMIUM_PRICE_COMPARE_AT,
  PREMIUM_PRICE_SYMBOL,
  PREMIUM_PRICE_INTERVAL,
} from '@/lib/pricing'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Pricing | Portal Astra',
  description: "Start free, always. Upgrade to Astra Premium for the full cosmic experience.",
}

const FREE_FEATURES = [
  'Full moon phase calendar',
  'Daily horoscope (all 12 signs)',
  'Live space weather and KP index',
  'NASA Picture of the Day',
  'Daily tarot card draw',
  'Personal 3-card tarot draw',
  'Weekly tarot spread',
  'Angel number decoder',
  'Birth calendar (life path, birthstone, birth flower)',
  'Moon events calendar',
  'Weekly cosmic digest email',
  'Near Earth Object tracker',
  'Share your cosmic readings',
]

// No "Early access to new features": there is no mechanism behind it and none
// is being built, so it was a promise nothing could keep.
const PREMIUM_FEATURES: { label: string; comingSoon?: boolean }[] = [
  { label: 'Everything in Free' },
  { label: 'Daily ritual prompts and journal questions per phase' },
  { label: 'Lunar planting calendar (best days to sow, prune, harvest)' },
  { label: 'Full moon and new moon intention-setting guides' },
  { label: 'Eclipse and supermoon email alerts 7 days prior' },
  { label: 'Monthly cosmic forecast email' },
]

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <h1 className={styles.title}>Choose Your Cosmic Journey</h1>
        <p className={styles.subtitle}>Start free, upgrade when you&apos;re ready.</p>

        <Suspense fallback={null}>
          <CheckoutBanners />
        </Suspense>

        <div className={styles.tiers}>
          {/* Free */}
          <div className={styles.tierCard}>
            <h2 className={styles.tierName}>Free</h2>
            <p className={styles.tierPrice}>AUD $0</p>
            <p className={styles.tierPriceNote}>Always free</p>
            <ul className={styles.featureList}>
              {FREE_FEATURES.map((f) => (
                <li key={f} className={styles.feature}><span className={styles.check}>✓</span> {f}</li>
              ))}
            </ul>
            <Link href="/" className={styles.ctaBtn}>Start exploring</Link>

            <AmazonProductRow
              heading="Begin your journey"
              searchQuery="cosmic spiritual journal"
              count={1}
            />
          </div>

          {/* Premium */}
          <div className={`${styles.tierCard} ${styles.tierPremium}`}>
            <span className={styles.badge}>Founder Pricing</span>
            <h2 className={styles.tierName}>Astra Premium ✦</h2>
            <p className={styles.tierPrice}>
              {PREMIUM_PRICE_DISPLAY}
              <span className={styles.tierPer}>/{PREMIUM_PRICE_INTERVAL}</span>
              <span
                style={{ marginLeft: '10px', fontSize: '0.55em', opacity: 0.5, textDecoration: 'line-through' }}
                aria-label={`Usually ${PREMIUM_PRICE_SYMBOL}${PREMIUM_PRICE_COMPARE_AT} per month`}
              >
                {PREMIUM_PRICE_SYMBOL}{PREMIUM_PRICE_COMPARE_AT}/{PREMIUM_PRICE_INTERVAL}
              </span>
            </p>
            <p className={styles.tierFounder}>Founder pricing, locked in while you stay subscribed</p>
            <ul className={styles.featureList}>
              {PREMIUM_FEATURES.map((f) => (
                <li key={f.label} className={styles.feature}>
                  <span className={styles.checkGold}>✦</span> {f.label}
                  {f.comingSoon && (
                    <span style={{ color: 'rgba(232, 224, 255, 0.4)', fontSize: '0.8em', marginLeft: '4px' }}>(coming soon)</span>
                  )}
                </li>
              ))}
            </ul>
            <CheckoutButton />
            <p className={styles.finePrint}>Secure checkout via Stripe. Cancel anytime.</p>
            <p style={{ fontSize: '12px', color: 'rgba(201,168,76,0.7)', lineHeight: 1.6, marginTop: '6px', textAlign: 'center' }}>
              Not happy in your first 30 days? Email us and we will refund you in full. No questions asked.
            </p>
          </div>
        </div>

        <div style={{
          marginTop: '32px',
          padding: '20px',
          background: 'rgba(155,138,255,0.04)',
          border: '1px solid rgba(155,138,255,0.12)',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(232,224,255,0.5)', lineHeight: '1.7' }}>
            No password needed. After subscribing, visit the Sky tab or Calendars page
            and enter your email. We send a one-time link that unlocks premium on that
            browser for 24 hours. Request a fresh link any time, on any device.
          </p>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '24px 0',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          marginTop: '40px',
        }}>
          <p style={{ fontSize: '12px', color: 'rgba(232,224,255,0.4)', margin: 0, lineHeight: 1.6 }}>
            Questions about your subscription?{' '}
            <a
              href="mailto:theportalastra@gmail.com"
              style={{ color: '#9b8aff', textDecoration: 'none' }}
            >
              theportalastra@gmail.com
            </a>
          </p>
        </div>
      </div>

      <Footer title="Portal Astra Pricing" shareText="Start free, upgrade when you're ready, Portal Astra" />
    </main>
  )
}
