'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import IntentionGuides from '@/components/IntentionGuides'
import AmazonProductRow from '@/components/AmazonProductRow'
import PremiumUnlock, { usePremium } from '@/components/PremiumUnlock'
import {
  SYNODIC_MONTH,
  getMoonPhase,
  getMoonDistanceKm,
  nextPhase,
  ECLIPSES,
} from '@/lib/shared'
import styles from './page.module.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function daysBetween(target: Date, from: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - from.getTime()) / 86400000))
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

interface GuideCard {
  name: string
  viz: string
  desc: string
  sci: string
  locked?: boolean
}

const GUIDE: GuideCard[] = [
  { name: 'New Moon', viz: 'vizNew', desc: 'The slate is wiped clean. Set intentions, plant seeds, begin new projects. Illumination: 0%', sci: 'The Moon sits between Earth and Sun; its lit side faces away from us.' },
  { name: 'Waxing Crescent', viz: 'vizWaxCres', desc: 'Momentum builds. Take first steps toward your intentions. Energy is gathering.', sci: 'A thin sliver appears in the western evening sky, one to seven days after new.' },
  { name: 'First Quarter', viz: 'vizFirstQ', desc: 'Decision point. Push through resistance. Action is required now.', sci: 'Exactly half the disc is lit; the Moon is a quarter of the way through its cycle.' },
  { name: 'Waxing Gibbous', viz: 'vizWaxGib', desc: 'Refine and adjust. You are close. Patience and persistence.', sci: 'More than half lit and still filling out toward full.' },
  { name: 'Full Moon', viz: 'vizFull', desc: 'Peak energy. Emotions run high. Release what no longer serves you. Illumination: 100%', sci: 'Earth lies between Sun and Moon; the entire near side is lit.' },
  { name: 'Waning Gibbous', viz: 'vizWanGib', desc: 'Share your wisdom. Give back. Gratitude and reflection.', sci: 'The lit area begins shrinking from the opposite edge.' },
  { name: 'Last Quarter', viz: 'vizLastQ', desc: 'Let go. Forgive. Release habits and patterns that hold you back.', sci: 'Half lit again, opposite the first quarter; it rises around midnight.' },
  { name: 'Waning Crescent', viz: 'vizWanCres', desc: 'Rest and restore. Surrender. Prepare for the new cycle ahead.', sci: 'A final thin curve in the eastern pre-dawn sky before new moon.' },
  { name: 'Supermoon', viz: 'vizSuper', desc: 'A full moon at perigee, up to 14% larger and 30% brighter. Emotions and energy amplified.', sci: 'Occurs when a full moon coincides with perigee, about 356,500 km away.' },
  { name: 'Eclipse', viz: 'vizEclipse', desc: 'A rare cosmic alignment. Solar eclipses bring sudden change. Lunar eclipses bring emotional revelation.', sci: 'Happens only when Sun, Earth and Moon align near the lunar nodes.' },
  { name: 'Void of Course', viz: 'vizVoid', desc: 'The moon between signs. Avoid major decisions. Rest, reflect, do routine tasks only.', sci: 'An astrological term: the Moon makes no major aspect before changing sign.' },
  { name: 'Daily Ritual Prompts', viz: 'vizFull', desc: 'Personalised journaling and intention-setting for every phase of the lunar cycle.', sci: '', locked: true },
  { name: 'Planting Calendar', viz: 'vizFull', desc: 'Best days to sow, prune, and harvest based on lunar cycles. Trusted by gardeners and farmers for centuries.', sci: '', locked: true },
]

const durStyle = (d: string): React.CSSProperties => ({ ['--dur']: d } as React.CSSProperties)

export default function MoonClient() {
  const [now, setNow] = useState<Date | null>(null)
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [eventsPaused, setEventsPaused] = useState(false)
  const [guidePaused, setGuidePaused] = useState(false)

  // Server-validated on mount. Never read from localStorage.
  const premium = usePremium()
  const isPremium = premium.status === 'premium'

  // Subscribe form
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subNote, setSubNote] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const d = new Date()
    setNow(d)
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [])

  const todayPhase = now ? getMoonPhase(now) : null
  // Distance comes from the anomalistic (perigee) cycle, not the phase cycle.
  const distance = now ? getMoonDistanceKm(now) : null

  let events: { name: string; date: Date; emoji: string }[] = []
  if (now) {
    const nextNew = nextPhase(now, 0)
    const nextFull = nextPhase(now, SYNODIC_MONTH / 2)
    let supermoon = nextFull
    for (let i = 0; i < 14; i++) {
      if (getMoonDistanceKm(supermoon) < 360000) break
      supermoon = nextPhase(new Date(supermoon.getTime() + 86400000), SYNODIC_MONTH / 2)
    }
    const upcomingEclipse = ECLIPSES
      .map((e) => ({ ...e, dt: new Date(e.date + 'T00:00:00Z') }))
      .filter((e) => e.dt.getTime() >= now.getTime())
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())[0]

    events = [
      { name: 'Next New Moon', date: nextNew, emoji: '🌑' },
      { name: 'Next Full Moon', date: nextFull, emoji: '🌕' },
      { name: 'Next Supermoon', date: supermoon, emoji: '🌕' },
      ...(upcomingEclipse ? [{ name: upcomingEclipse.label, date: upcomingEclipse.dt, emoji: '🌘' }] : []),
    ]
  }

  let calendarCells: (Date | null)[] = []
  let calTitle = ''
  if (viewDate) {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    calTitle = `${MONTH_NAMES[month]} ${year}`
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let i = 0; i < startOffset; i++) calendarCells.push(null)
    for (let d = 1; d <= daysInMonth; d++) calendarCells.push(new Date(year, month, d))
  }

  const sameDay = (a: Date | null, b: Date | null) =>
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const shiftMonth = (delta: number) => {
    if (!viewDate) return
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1))
  }

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (subscribing) return
    setSubscribing(true)
    setSubNote(null)
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (r.ok) {
        setSubNote({ ok: true, msg: "You're in ✦" })
        setEmail('')
      } else {
        setSubNote({ ok: false, msg: d.error || 'Something went wrong.' })
      }
    } catch {
      setSubNote({ ok: false, msg: 'Network error, try again.' })
    }
    setSubscribing(false)
  }

  const renderGuideCard = (card: GuideCard, i: number) => {
    // Only lock the card if this visitor actually lacks premium. These two
    // features are built and gated correctly elsewhere on the site, so showing
    // a paying subscriber a "Coming Soon" padlock over something they already
    // have access to was telling them their subscription bought nothing.
    if (card.locked && !isPremium) {
      return (
        <div key={`${card.name}-${i}`} className={`${styles.carouselCard} ${styles.lockedCard}`}>
          <div className={styles.lockedContent}>
            <div className={`${styles.vizBase} ${styles.vizFull}`} aria-hidden />
            <h3 className={styles.cardName}>{card.name}</h3>
            <p className={styles.cardDesc}>{card.desc}</p>
          </div>
          <div className={styles.lockOverlay}>
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.lockLabel}>Astra Premium</span>
          </div>
        </div>
      )
    }
    if (card.locked) {
      return (
        <div key={`${card.name}-${i}`} className={styles.carouselCard}>
          <div className={`${styles.vizBase} ${styles.vizFull}`} aria-hidden />
          <h3 className={styles.cardName}>{card.name}</h3>
          <p className={styles.cardDesc}>{card.desc}</p>
          <p className={styles.cardSci}>Included with your Astra Premium subscription.</p>
        </div>
      )
    }
    return (
      <div key={`${card.name}-${i}`} className={styles.carouselCard}>
        <div className={`${styles.vizBase} ${styles[card.viz as keyof typeof styles]}`} aria-hidden />
        <h3 className={styles.cardName}>{card.name}</h3>
        <p className={styles.cardDesc}>{card.desc}</p>
        <p className={styles.cardSci}>Scientific note: {card.sci}</p>
      </div>
    )
  }

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Moon Phase Calendar</h1>
          <p className={styles.heroSub}>Track the lunar cycle. Understand its rhythms.</p>
        </section>

        {/* Intro */}
        <p className={styles.intro}>
          The moon completes its cycle every 29.5 days, passing through eight distinct phases. Each
          phase carries its own energy and meaning, scientific, spiritual, and practical. Use this
          calendar to track where we are in the current cycle.
        </p>

        {/* Calendar */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>This Month</h2>
          {viewDate ? (
            <div className={styles.calendar}>
              <div className={styles.calHeader}>
                <button className={styles.calNavBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
                <h3 className={styles.calTitle}>{calTitle}</h3>
                <button className={styles.calNavBtn} onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
              </div>
              <div className={styles.weekLabels}>
                {DAY_LABELS.map((d) => (
                  <div key={d} className={styles.weekLabel}>{d}</div>
                ))}
              </div>
              <div className={styles.calGrid}>
                {calendarCells.map((cell, i) => {
                  if (!cell) return <div key={`e${i}`} className={styles.dayCellEmpty} />
                  const phase = getMoonPhase(cell)
                  const classes = [styles.dayCell]
                  if (sameDay(cell, now)) classes.push(styles.dayToday)
                  if (phase.index === 4) classes.push(styles.dayFull)
                  if (phase.index === 0) classes.push(styles.dayNew)
                  return (
                    <div key={cell.toISOString()} className={classes.join(' ')}>
                      <span className={styles.dayNum}>{cell.getDate()}</span>
                      <span className={styles.dayEmoji}>{phase.emoji}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className={styles.loading}>Loading calendar…</p>
          )}
        </section>

        {/* Upcoming events, auto-scroll carousel */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Upcoming Events</h2>
          {now ? (
            <div className={styles.carouselWrap}>
              <button className={styles.pauseBtn} onClick={() => setEventsPaused((p) => !p)}>
                {eventsPaused ? '▶ Play' : '⏸ Pause'}
              </button>
              <div className={styles.carouselOuter} style={durStyle('25s')}>
                <div className={styles.carouselTrack} style={{ animationPlayState: eventsPaused ? 'paused' : undefined }}>
                  {[...events, ...events].map((ev, i) => (
                    <div key={`${ev.name}-${i}`} className={styles.eventCard}>
                      <span className={styles.eventEmoji}>{ev.emoji}</span>
                      <p className={styles.eventName}>{ev.name}</p>
                      <p className={styles.eventDate}>{fmtDate(ev.date)}</p>
                      <p className={styles.eventCountdown}>in {daysBetween(ev.date, now)} days</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.loading}>Loading events…</p>
          )}
        </section>

        {/* Phase guide, auto-scroll carousel */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Phase Guide</h2>
          <div className={styles.carouselWrap}>
            <button className={styles.pauseBtn} onClick={() => setGuidePaused((p) => !p)}>
              {guidePaused ? '▶ Play' : '⏸ Pause'}
            </button>
            <div className={styles.carouselOuter} style={durStyle('55s')}>
              <div className={styles.carouselTrack} style={{ animationPlayState: guidePaused ? 'paused' : undefined }}>
                {[...GUIDE, ...GUIDE].map((card, i) => renderGuideCard(card, i))}
              </div>
            </div>
          </div>
        </section>

        {/* Premium, full moon and new moon intention-setting guides */}
        {isPremium && (
          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>Intention Guides</h2>
            <IntentionGuides />
          </section>
        )}

        {/* Subscribe CTA */}
        <section className={styles.section}>
          <div className={styles.subscribe}>
            <h2 className={styles.subscribeHeading}>Get the cosmos in your inbox</h2>
            <p className={styles.subscribeText}>
              Every Sunday evening, a weekly cosmic digest, moon phases, space weather, and
              astronomical highlights for the week ahead.
            </p>
            <form className={styles.subscribeForm} onSubmit={subscribe}>
              <input
                type="email"
                className={styles.subscribeInput}
                placeholder="you@example.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.subscribeBtn} disabled={subscribing}>
                {subscribing ? 'Joining...' : 'Subscribe'}
              </button>
            </form>
            {subNote && (
              <p className={subNote.ok ? styles.subscribeOk : styles.subscribeErr}>{subNote.msg}</p>
            )}
          </div>
        </section>

        {/* Recommended reading */}
        <AmazonProductRow
          heading="Deepen your lunar practice"
          searchQuery="moon phases astrology guide"
        />

        {/* Astronomical data */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Today&apos;s Lunar Data</h2>
          {todayPhase && distance !== null ? (
            <div className={styles.dataGrid}>
              <div className={styles.dataCard}>
                <p className={styles.dataLabel}>Illumination</p>
                <p className={styles.dataValue}>{todayPhase.illumination}%</p>
              </div>
              <div className={styles.dataCard}>
                <p className={styles.dataLabel}>Moon Age</p>
                <p className={styles.dataValue}>{todayPhase.age.toFixed(1)} days</p>
              </div>
              <div className={styles.dataCard}>
                <p className={styles.dataLabel}>Distance</p>
                <p className={styles.dataValue}>{distance.toLocaleString('en-AU')} km</p>
              </div>
              <div className={styles.dataCard}>
                <p className={styles.dataLabel}>Moonrise</p>
                <p className={styles.dataValue} style={{ fontSize: '1rem' }}>Varies by location</p>
              </div>
            </div>
          ) : (
            <p className={styles.loading}>Loading data…</p>
          )}
        </section>
      </div>

      {/* The Pinterest-only block that used to sit here is gone: the footer's
          ShareButtons already carries Pinterest, plus six other targets. */}
      <Footer
        shareText="Track the lunar cycle on Portal Astra, Moon Phase Calendar"
        shareImage="https://portalastra.com/images/portalastralogohorizontal.png"
      />
    </main>
  )
}
