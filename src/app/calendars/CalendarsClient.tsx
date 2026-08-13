'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PlantingCalendar from '@/components/PlantingCalendar'
import PremiumUnlock, { usePremium } from '@/components/PremiumUnlock'
import {
  getMoonPhase,
  getLifePath,
  LIFE_PATHS,
  getTodayAEST,
  type LifePathInfo,
} from '@/lib/shared'
import styles from './page.module.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const BIRTHSTONES = ['Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl', 'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise']
const BIRTH_FLOWERS = ['Carnation', 'Violet', 'Daffodil', 'Daisy', 'Lily of the Valley', 'Rose', 'Larkspur', 'Gladiolus', 'Aster', 'Marigold', 'Chrysanthemum', 'Narcissus']

// [last day of this month's first sign, sign name] indexed by month-1
const ZODIAC: [number, string][] = [
  [19, 'Capricorn'], [18, 'Aquarius'], [20, 'Pisces'], [19, 'Aries'], [20, 'Taurus'], [20, 'Gemini'],
  [22, 'Cancer'], [22, 'Leo'], [22, 'Virgo'], [22, 'Libra'], [21, 'Scorpio'], [21, 'Sagittarius'],
]
function getSign(month: number, day: number): string {
  const [cutoff, sign] = ZODIAC[month - 1]
  if (day <= cutoff) return sign
  return month === 12 ? 'Capricorn' : ZODIAC[month][1]
}
// Real length of a month, leap years included. The day dropdown used to offer
// 31 options unconditionally, so 31 February was selectable and produced a
// life path number for a date that has never existed.
function daysInMonth(month: number, year: number): number {
  if (!month) return 31
  if (!year) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31
  return new Date(year, month, 0).getDate()
}

function zodiacElement(sign: string): string {
  if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) return 'Fire'
  if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) return 'Earth'
  if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) return 'Air'
  return 'Water'
}

type TabId = 'moon' | 'planting' | 'birth'

export default function CalendarsClient() {
  const [tab, setTab] = useState<TabId>('moon')

  // Server-validated on mount. Never read from localStorage.
  const premium = usePremium()
  const isPremium = premium.status === 'premium'
  const [moonInfo, setMoonInfo] = useState<{ name: string; emoji: string; illumination: number } | null>(null)
  const [years, setYears] = useState<number[]>([])

  // Birth form
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [birthError, setBirthError] = useState('')
  const [result, setResult] = useState<null | {
    num: number; info: LifePathInfo; birthstone: string; flower: string; element: string; sign: string
  }>(null)
  const [copiedProfile, setCopiedProfile] = useState(false)

  // Planting waitlist
  const [pEmail, setPEmail] = useState('')
  const [pBusy, setPBusy] = useState(false)
  const [pNote, setPNote] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    setMoonInfo(getMoonPhase(new Date()))
    // Bound the year list by the AEST date, same "today" the rest of the site uses.
    const cy = Number(getTodayAEST().slice(0, 4))
    const ys: number[] = []
    for (let y = cy; y >= 1920; y--) ys.push(y)
    setYears(ys)
    if (typeof window !== 'undefined' && window.location.hash === '#birth') setTab('birth')
  }, [])

  // Changing the month or year can strand an already-selected day (31 selected,
  // then February chosen). Drop it rather than silently keeping an impossible
  // value in state.
  const clampDay = (nextMonth: string, nextYear: string) => {
    if (!day) return
    if (Number(day) > daysInMonth(Number(nextMonth), Number(nextYear))) setDay('')
  }

  const calculate = () => {
    setBirthError('')
    if (!day || !month || !year) return
    const d = Number(day)
    const m = Number(month)
    const y = Number(year)

    // Guard against a date that does not exist (31 February) and against a
    // future birth date, matching the guard the homepage calculator already
    // has. The day dropdown is now derived from month and year, so a bad
    // combination is only reachable by changing the month after picking a day.
    if (d > daysInMonth(m, y)) {
      setResult(null)
      setBirthError(`${MONTHS[m - 1]} ${y} only has ${daysInMonth(m, y)} days.`)
      return
    }

    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (iso > getTodayAEST()) {
      setResult(null)
      setBirthError('Please enter a date in the past. Your birth date cannot be in the future.')
      return
    }

    const num = getLifePath(d, m, y)
    const sign = getSign(m, d)
    setResult({
      num,
      info: LIFE_PATHS[num],
      birthstone: BIRTHSTONES[m - 1],
      flower: BIRTH_FLOWERS[m - 1],
      element: zodiacElement(sign),
      sign,
    })
  }

  const joinPlanting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pBusy) return
    setPBusy(true)
    setPNote(null)
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pEmail, source: 'planting-waitlist' }),
      })
      const dd = await r.json()
      if (r.ok) { setPNote({ ok: true, msg: "You're on the list!" }); setPEmail('') }
      else setPNote({ ok: false, msg: dd.error || 'Something went wrong.' })
    } catch { setPNote({ ok: false, msg: 'Network error, try again.' }) }
    setPBusy(false)
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'moon', label: 'Moon' },
    { id: 'planting', label: 'Planting' },
    { id: 'birth', label: 'Birth' },
  ]

  return (
    <main className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        <h1 className={styles.title}>Cosmic Calendars</h1>
        <p className={styles.subtitle}>Your complete cosmic planning toolkit.</p>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* MOON TAB */}
        {tab === 'moon' && (
          <div className={styles.card}>
            <p className={styles.cardText}>
              The full lunar cycle, phase by phase. Track every moon phase for the month ahead.
            </p>
            {moonInfo && (
              <div className={styles.moonNow}>
                <span className={styles.moonNowEmoji}>{moonInfo.emoji}</span>
                <div>
                  <p className={styles.moonNowName}>{moonInfo.name}</p>
                  <p className={styles.moonNowIllum}>{moonInfo.illumination}% illuminated</p>
                </div>
              </div>
            )}
            <Link href="/moon" className={styles.primaryBtn}>Open Moon Phase Calendar</Link>
          </div>
        )}

        {/* PLANTING TAB */}
        {tab === 'planting' && (
          isPremium ? (
            <div className={styles.card}>
              <PlantingCalendar />
            </div>
          ) : (
            <>
              <div className={`${styles.card} ${styles.lockedCard}`}>
                <span className={styles.lockIcon}>🔒</span>
                {/* Not "Coming Soon": the planting calendar is built and is
                    rendered above for premium visitors. It is available now,
                    to subscribers. */}
                <p className={styles.comingSoon}>Included with Astra Premium</p>
                <p className={styles.cardText}>
                  The best days to sow, prune, and harvest based on lunar cycles. Trusted by gardeners and
                  farmers for centuries. Available now to Astra Premium subscribers, or join the waitlist
                  below for planting tips in the weekly digest.
                </p>
                <form className={styles.waitForm} onSubmit={joinPlanting}>
                  <input
                    type="email"
                    className={styles.waitInput}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className={styles.primaryBtn} disabled={pBusy}>
                    {pBusy ? 'Joining...' : 'Join waitlist'}
                  </button>
                </form>
                {pNote && <p className={pNote.ok ? styles.noteOk : styles.noteErr}>{pNote.msg}</p>}
              </div>

              <div style={{ marginTop: '12px' }}>
                <PremiumUnlock
                  heading="Already a member?"
                  blurb="Enter the email you subscribed with and we will send you an unlock link for the planting calendar. It works once and expires in 20 minutes."
                />
              </div>
            </>
          )
        )}

        {/* BIRTH TAB */}
        {tab === 'birth' && (
          <div className={styles.card}>
            <h2 className={styles.birthHeading}>Discover Your Life Path Number</h2>
            <p className={styles.cardText}>
              Your date of birth reveals your life path, the cosmic blueprint of your journey.
            </p>

            <div className={styles.dobRow}>
              <select className={styles.dobSelect} aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="">Day</option>
                {/* Derived from the selected month and year, so February never
                    offers 30 or 31 and non-leap years never offer the 29th. */}
                {Array.from({ length: daysInMonth(Number(month), Number(year)) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                className={styles.dobSelect}
                aria-label="Month"
                value={month}
                onChange={(e) => { setMonth(e.target.value); clampDay(e.target.value, year) }}
              >
                <option value="">Month</option>
                {MONTHS.map((mName, i) => (
                  <option key={mName} value={i + 1}>{mName}</option>
                ))}
              </select>
              <select
                className={styles.dobSelect}
                aria-label="Year"
                value={year}
                onChange={(e) => { setYear(e.target.value); clampDay(month, e.target.value) }}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button className={styles.primaryBtn} onClick={calculate}>Calculate</button>
            </div>

            {birthError && <p className={styles.noteErr}>{birthError}</p>}

            {result && (
              <div className={styles.resultCard}>
                <p className={styles.resultLabel}>Life Path Number</p>
                <p className={styles.resultNum}>{result.num}</p>
                <p className={styles.resultName}>{result.info.name}</p>
                <p className={styles.resultDesc}>{result.info.desc}</p>

                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <span className={styles.resultItemLabel}>Compatible numbers</span>
                    <span className={styles.resultItemValue}>{result.info.compat.join(', ')}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultItemLabel}>Shares your number</span>
                    <span className={styles.resultItemValue}>{result.info.famous}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultItemLabel}>Birthstone</span>
                    <span className={styles.resultItemValue}>{result.birthstone}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultItemLabel}>Birth flower</span>
                    <span className={styles.resultItemValue}>{result.flower}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.resultItemLabel}>Zodiac element</span>
                    <span className={styles.resultItemValue}>{result.element} ({result.sign})</span>
                  </div>
                </div>

                <button
                  className={styles.shareBtn}
                  style={{ background: '#b8a4ff', color: '#0a0a0f', margin: '0.75rem auto 0', display: 'block' }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`My Portal Astra cosmic profile: Life Path ${result.num}, ${result.sign}, ${result.element} element, ${result.birthstone} birthstone, portalastra.com`)
                      setCopiedProfile(true)
                      setTimeout(() => setCopiedProfile(false), 2000)
                    } catch {}
                  }}
                >
                  {copiedProfile ? 'Copied!' : 'Share my cosmic profile'}
                </button>

                <a
                  className={styles.amazonLink}
                  href={`https://www.amazon.com.au/s?k=${encodeURIComponent(result.birthstone)}+crystal&tag=blasdigital-22`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Shop {result.birthstone} crystals on Amazon
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* One share row for the page. When a life-path result is on screen the
          share text carries it, which is what the removed inline row did. */}
      <Footer
        title="Cosmic Calendars"
        shareText={
          result
            ? `I am a Life Path ${result.num}, ${result.info.name} on Portal Astra`
            : 'Explore the cosmic calendars on Portal Astra'
        }
        shareImage="https://portalastra.com/images/portalastralogohorizontal.png"
      />
    </main>
  )
}
