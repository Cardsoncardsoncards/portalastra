import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CheckoutBanners, CheckoutButton } from './CheckoutClient'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Pricing | Portal Astra',
  description: "Start free forever. Upgrade to Astra Premium for the full cosmic experience.",
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

const PREMIUM_FEATURES: { label: string; comingSoon?: boolean }[] = [
  { label: 'Everything in Free' },
  { label: 'Daily ritual prompts and journal questions per phase', comingSoon: true },
  { label: 'Lunar planting calendar (best days to sow, prune, harvest)' },
  { label: 'Full moon and new moon intention-setting guides', comingSoon: true },
  { label: 'Eclipse and supermoon email alerts 7 days prior', comingSoon: true },
  { label: 'Monthly cosmic forecast email', comingSoon: true },
  { label: 'Early access to new features' },
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
          </div>

          {/* Premium */}
          <div className={`${styles.tierCard} ${styles.tierPremium}`}>
            <span className={styles.badge}>Founder Pricing</span>
            <h2 className={styles.tierName}>Astra Premium ✦</h2>
            <p className={styles.tierPrice}>AUD $7.95<span className={styles.tierPer}>/month</span></p>
            <p className={styles.tierFounder}>Founder pricing, locked in forever</p>
            <p className={styles.tierStandard}>Usually AUD $9.95/month or $79/year</p>
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
          </div>
        </div>
      </div>

      <Footer title="Portal Astra Pricing" shareText="Start free, upgrade when you're ready — Portal Astra" />
    </main>
  )
}
