'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import styles from './page.module.css'

const CYCLE = 29.53059
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) // Jan 6 2000 new moon (UTC)
const ANOM = 27.55455
const KNOWN_PERIGEE = Date.UTC(2024, 0, 13) // approx perigee epoch (for supermoon estimate)

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]
const PHASE_EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Phase {
  name: string
  emoji: string
  index: number
  illumination: number
  age: number
  frac: number
}

// Standard lunar-cycle calculation from a known new-moon reference.
function getMoonPhase(date: Date): Phase {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000
  let age = days % CYCLE
  if (age < 0) age += CYCLE
  const frac = age / CYCLE
  const illumination = Math.round(((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100)
  const index = Math.floor(frac * 8 + 0.5) % 8
  return { name: PHASE_NAMES[index], emoji: PHASE_EMOJIS[index], index, illumination, age, frac }
}

// Approximate Earth–Moon distance from the synodic phase (356,500–406,700 km).
function phaseDistanceKm(frac: number): number {
  return Math.round(381600 - 25100 * Math.cos(frac * 2 * Math.PI))
}

// Anomalistic-month distance, used only to estimate when a full moon is a supermoon.
function anomDistanceKm(date: Date): number {
  let p = ((date.getTime() - KNOWN_PERIGEE) / 86400000) % ANOM
  if (p < 0) p += ANOM
  return Math.round(385000 - 28500 * Math.cos((p / ANOM) * 2 * Math.PI))
}

// Next date (after `from`) where the moon reaches a given age in the cycle.
function nextPhase(from: Date, targetAge: number): Date {
  const days = (from.getTime() - KNOWN_NEW_MOON) / 86400000
  let age = days % CYCLE
  if (age < 0) age += CYCLE
  let delta = (targetAge - age + CYCLE) % CYCLE
  if (delta < 0.01) delta += CYCLE
  return new Date(from.getTime() + delta * 86400000)
}

function daysBetween(target: Date, from: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - from.getTime()) / 86400000))
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const ECLIPSES = [
  { date: '2026-08-12', label: 'Total Solar Eclipse' },
  { date: '2026-02-06', label: 'Annular Solar Eclipse' },
  { date: '2027-08-02', label: 'Total Solar Eclipse' },
  { date: '2025-09-07', label: 'Total Lunar Eclipse' },
]

const CAROUSEL = [
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
]

export default function MoonClient() {
  // Date-dependent state is set after mount to avoid SSR/hydration mismatch.
  const [now, setNow] = useState<Date | null>(null)
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    const d = new Date()
    setNow(d)
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [])

  const todayPhase = now ? getMoonPhase(now) : null
  const distance = todayPhase ? phaseDistanceKm(todayPhase.frac) : null

  // Upcoming events
  let events: { name: string; date: Date; emoji: string }[] = []
  if (now) {
    const nextNew = nextPhase(now, 0)
    const nextFull = nextPhase(now, CYCLE / 2)
    let supermoon = nextFull
    for (let i = 0; i < 14; i++) {
      if (anomDistanceKm(supermoon) < 360000) break
      supermoon = nextPhase(new Date(supermoon.getTime() + 86400000), CYCLE / 2)
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

  // Calendar cells for the viewed month
  let calendarCells: (Date | null)[] = []
  let calTitle = ''
  if (viewDate) {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    calTitle = `${MONTH_NAMES[month]} ${year}`
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
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

  const maxIndex = CAROUSEL.length - 1
  const goPrev = () => setCarouselIndex((i) => Math.max(0, i - 1))
  const goNext = () => setCarouselIndex((i) => Math.min(maxIndex, i + 1))

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Moon Phase Calendar</h1>
          <p className={styles.heroSub}>Track the lunar cycle. Understand its rhythms.</p>
        </section>

        {/* Calendar */}
        <section className={styles.section}>
          {viewDate ? (
            <div className={styles.calendar}>
              <div className={styles.calHeader}>
                <button className={styles.calNavBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
                <h2 className={styles.calTitle}>{calTitle}</h2>
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

        {/* Upcoming events */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Upcoming Events</h2>
          {now ? (
            <div className={styles.events}>
              {events.map((ev) => (
                <div key={ev.name} className={styles.eventCard}>
                  <span className={styles.eventEmoji}>{ev.emoji}</span>
                  <p className={styles.eventName}>{ev.name}</p>
                  <p className={styles.eventDate}>{fmtDate(ev.date)}</p>
                  <p className={styles.eventCountdown}>in {daysBetween(ev.date, now)} days</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.loading}>Loading events…</p>
          )}
        </section>

        {/* Phase guide carousel */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Phase Guide</h2>
          <div className={styles.carouselWrap}>
            <div className={styles.carouselViewport}>
              <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(calc(-${carouselIndex} * (280px + 1rem)))` }}
              >
                {CAROUSEL.map((card) => (
                  <div key={card.name} className={styles.carouselCard}>
                    <div className={`${styles.vizBase} ${styles[card.viz as keyof typeof styles]}`} aria-hidden />
                    <h3 className={styles.cardName}>{card.name}</h3>
                    <p className={styles.cardDesc}>{card.desc}</p>
                    <p className={styles.cardSci}>Scientific note: {card.sci}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.carouselControls}>
              <button className={styles.carouselBtn} onClick={goPrev} aria-label="Previous phase">‹</button>
              <div className={styles.dots}>
                {CAROUSEL.map((card, i) => (
                  <button
                    key={card.name}
                    className={`${styles.dot} ${i === carouselIndex ? styles.dotActive : ''}`}
                    onClick={() => setCarouselIndex(i)}
                    aria-label={`Go to ${card.name}`}
                  />
                ))}
              </div>
              <button className={styles.carouselBtn} onClick={goNext} aria-label="Next phase">›</button>
            </div>
          </div>
        </section>

        {/* Astronomical data */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Today&apos;s Data</h2>
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

        <footer className={styles.footer}>
          <p>
            <Link href="/" className={styles.footerLink}>Home</Link>
            {'  ·  '}
            <Link href="/blog" className={styles.footerLink}>Blog</Link>
            {'  ·  '}
            <Link href="/about" className={styles.footerLink}>About</Link>
            {'  ·  '}
            <Link href="/privacy" className={styles.footerLink}>Privacy</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
