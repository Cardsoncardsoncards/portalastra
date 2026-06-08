import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WaitlistForm from './WaitlistForm'
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

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Daily ritual prompts and journal questions per phase',
  'Lunar planting calendar (best days to sow, prune, harvest)',
  'Full moon and new moon intention-setting guides',
  'Eclipse and supermoon email alerts 7 days prior',
  'Monthly cosmic forecast email',
  'Ad-free experience',
  'Early access to new features',
]

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <h1 className={styles.title}>Choose Your Cosmic Journey</h1>
        <p className={styles.subtitle}>Start free, upgrade when you&apos;re ready.</p>

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
            <p className={styles.tierFounder}>First 100 members, locked in forever</p>
            <p className={styles.tierStandard}>Usually AUD $9.95/month or $79/year</p>
            <p className={styles.tierSpots}>Founder spots remaining: 100</p>
            <ul className={styles.featureList}>
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className={styles.feature}><span className={styles.checkGold}>✦</span> {f}</li>
              ))}
            </ul>
            <WaitlistForm
              buttonText="Join the waitlist"
              successText="You're on the list! We'll notify you at launch."
              source="premium-waitlist"
            />
            <p className={styles.finePrint}>No credit card required. We&apos;ll email you when Premium launches.</p>
          </div>
        </div>
      </div>

      <Footer title="Portal Astra Pricing" shareText="Start free, upgrade when you're ready — Portal Astra" />
    </main>
  )
}
