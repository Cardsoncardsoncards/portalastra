'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PlantingCalendar from '@/components/PlantingCalendar'
import AmazonProductRow from '@/components/AmazonProductRow'
import styles from './page.module.css'

// --- moon phase (same calculation as the Moon page) -------------------------
const CYCLE = 29.53059
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]
const PHASE_EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

function getMoonPhase(date: Date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000
  let age = days % CYCLE
  if (age < 0) age += CYCLE
  const frac = age / CYCLE
  const illumination = Math.round(((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100)
  const index = Math.floor(frac * 8 + 0.5) % 8
  return { name: PHASE_NAMES[index], emoji: PHASE_EMOJIS[index], illumination }
}

// --- numerology -------------------------------------------------------------
function reduceKeepMaster(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split('').reduce((a, b) => a + Number(b), 0)
  }
  return n
}

function lifePath(day: number, month: number, year: number): number {
  const digits = `${day}${month}${year}`
  const sum = digits.split('').reduce((a, b) => a + Number(b), 0)
  return reduceKeepMaster(sum)
}

interface LifePathInfo { name: string; desc: string; compat: number[]; famous: string }
const LIFE_PATHS: Record<number, LifePathInfo> = {
  1: { name: 'The Leader', desc: 'Independent, pioneering, driven. You forge your own path.', compat: [3, 5, 9], famous: 'Steve Jobs' },
  2: { name: 'The Mediator', desc: 'Diplomatic, sensitive, cooperative. You bring harmony.', compat: [6, 8, 9], famous: 'Barack Obama' },
  3: { name: 'The Creator', desc: 'Expressive, joyful, imaginative. You inspire others.', compat: [1, 5, 9], famous: 'David Bowie' },
  4: { name: 'The Builder', desc: 'Disciplined, practical, reliable. You create foundations.', compat: [2, 7, 8], famous: 'Oprah Winfrey' },
  5: { name: 'The Adventurer', desc: 'Free-spirited, curious, adaptable. You embrace change.', compat: [1, 3, 7], famous: 'Angelina Jolie' },
  6: { name: 'The Nurturer', desc: 'Caring, responsible, loving. You support those around you.', compat: [2, 3, 9], famous: 'John Lennon' },
  7: { name: 'The Seeker', desc: 'Analytical, spiritual, introspective. You search for truth.', compat: [4, 5, 7], famous: 'Princess Diana' },
  8: { name: 'The Achiever', desc: 'Ambitious, authoritative, successful. You manifest abundance.', compat: [2, 4, 6], famous: 'Pablo Picasso' },
  9: { name: 'The Humanitarian', desc: 'Compassionate, wise, generous. You serve the greater good.', compat: [1, 3, 6], famous: 'Mahatma Gandhi' },
  11: { name: 'The Visionary (Master Number)', desc: 'Intuitive, inspiring, enlightened. You are here to illuminate.', compat: [2, 11, 22], famous: 'Prince William' },
  22: { name: 'The Master Builder (Master Number)', desc: 'Powerful, visionary, capable. You turn dreams into reality.', compat: [4, 11, 22], famous: 'Bill Gates' },
  33: { name: 'The Master Teacher (Master Number)', desc: 'Compassionate, selfless, devoted. You uplift all of humanity.', compat: [6, 11, 33], famous: 'Stephen King' },
}

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
function zodiacElement(sign: string): string {
  if (['Aries', 'Leo', 'Sagittarius'].includes(sign)) return 'Fire'
  if (['Taurus', 'Virgo', 'Capricorn'].includes(sign)) return 'Earth'
  if (['Gemini', 'Libra', 'Aquarius'].includes(sign)) return 'Air'
  return 'Water'
}

const CALENDARS_URL = 'https://portalastra.com/calendars'

function ShareRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent
  const url = CALENDARS_URL
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  return (
    <div className={styles.shareRow}>
      <a className={styles.shareBtn} style={{ background: '#1877F2' }} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className={styles.shareBtn} style={{ background: '#000000' }} href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`} target="_blank" rel="noopener noreferrer">X</a>
      <a className={styles.shareBtn} style={{ background: '#25D366' }} href={`https://wa.me/?text=${enc(text)}%20${enc(url)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className={styles.shareBtn} style={{ background: '#FF4500' }} href={`https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}`} target="_blank" rel="noopener noreferrer">Reddit</a>
      <button className={styles.shareBtn} style={{ background: '#b8a4ff', color: '#0a0a0f' }} onClick={copy}>{copied ? 'Copied!' : 'Copy Link'}</button>
    </div>
  )
}

type TabId = 'moon' | 'planting' | 'birth'

export default function CalendarsClient() {
  const [tab, setTab] = useState<TabId>('moon')
  const [isPremium, setIsPremium] = useState(false)
  const [moonInfo, setMoonInfo] = useState<{ name: string; emoji: string; illumination: number } | null>(null)
  const [years, setYears] = useState<number[]>([])

  // Birth form
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [result, setResult] = useState<null | {
    num: number; info: LifePathInfo; birthstone: string; flower: string; element: string; sign: string
  }>(null)
  const [copiedProfile, setCopiedProfile] = useState(false)

  // Planting waitlist
  const [pEmail, setPEmail] = useState('')
  const [pBusy, setPBusy] = useState(false)
  const [pNote, setPNote] = useState<{ ok: boolean; msg: string } | null>(null)

  // Premium unlock
  const [premiumEmail, setPremiumEmail] = useState('')
  const [premiumLoading, setPremiumLoading] = useState(false)
  const [premiumError, setPremiumError] = useState('')

  useEffect(() => {
    setMoonInfo(getMoonPhase(new Date()))
    const cy = new Date().getFullYear()
    const ys: number[] = []
    for (let y = cy; y >= 1920; y--) ys.push(y)
    setYears(ys)
    if (typeof window !== 'undefined' && window.location.hash === '#birth') setTab('birth')
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pa_premium_verified')
      if (stored) {
        const { verified, expires } = JSON.parse(stored)
        if (verified && Date.now() < expires) setIsPremium(true)
      }
    } catch {}
  }, [])

  const calculate = () => {
    if (!day || !month || !year) return
    const d = Number(day)
    const m = Number(month)
    const y = Number(year)
    const num = lifePath(d, m, y)
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
    } catch { setPNote({ ok: false, msg: 'Network error — try again.' }) }
    setPBusy(false)
  }

  const handleVerifyPremium = async () => {
    if (!premiumEmail.includes('@')) {
      setPremiumError('Please enter a valid email.')
      return
    }
    setPremiumLoading(true)
    setPremiumError('')
    try {
      const res = await fetch('/api/verify-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: premiumEmail }),
      })
      const data = await res.json()
      if (data.isPaid) {
        const expires = Date.now() + 30 * 24 * 60 * 60 * 1000
        localStorage.setItem('pa_premium_verified', JSON.stringify({ verified: true, expires }))
        setIsPremium(true)
        setPremiumEmail('')
      } else {
        setPremiumError('This email is not linked to an active Astra Premium subscription.')
      }
    } catch {
      setPremiumError('Something went wrong. Please try again.')
    }
    setPremiumLoading(false)
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
                <p className={styles.comingSoon}>Coming Soon — Astra Premium</p>
                <p className={styles.cardText}>
                  The best days to sow, prune, and harvest based on lunar cycles. Trusted by gardeners and
                  farmers for centuries.
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

              <div style={{
                marginTop: '12px',
                background: 'rgba(155,138,255,0.06)',
                border: '1px solid rgba(155,138,255,0.2)',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9b8aff', marginBottom: '8px' }}>
                  Already a member?
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(232,224,255,0.6)', marginBottom: '14px', lineHeight: '1.6' }}>
                  Enter your email to unlock the planting calendar now.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={premiumEmail}
                    onChange={e => setPremiumEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyPremium()}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(155,138,255,0.25)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#e8e0ff',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleVerifyPremium}
                    disabled={premiumLoading}
                    style={{
                      background: 'linear-gradient(135deg, #7B5EA7, #C9A84C)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: premiumLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {premiumLoading ? 'Checking...' : 'Unlock'}
                  </button>
                </div>
                {premiumError && (
                  <p style={{ color: '#ff8080', fontSize: '12px', marginTop: '8px' }}>{premiumError}</p>
                )}
                <p style={{ fontSize: '11px', color: 'rgba(232,224,255,0.25)', marginTop: '10px' }}>
                  Not a member yet? <a href="/pricing" style={{ color: '#9b8aff' }}>View Astra Premium</a>
                </p>
              </div>
            </>
          )
        )}

        {/* BIRTH TAB */}
        {tab === 'birth' && (
          <div className={styles.card}>
            <h2 className={styles.birthHeading}>Discover Your Life Path Number</h2>
            <p className={styles.cardText}>
              Your date of birth reveals your life path — the cosmic blueprint of your journey.
            </p>

            <div className={styles.dobRow}>
              <select className={styles.dobSelect} style={{ color: '#0a0a0f' }} aria-label="Day" value={day} onChange={(e) => setDay(e.target.value)}>
                <option value="">Day</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select className={styles.dobSelect} style={{ color: '#0a0a0f' }} aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Month</option>
                {MONTHS.map((mName, i) => (
                  <option key={mName} value={i + 1}>{mName}</option>
                ))}
              </select>
              <select className={styles.dobSelect} style={{ color: '#0a0a0f' }} aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button className={styles.primaryBtn} onClick={calculate}>Calculate</button>
            </div>

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
                      await navigator.clipboard.writeText(`My Portal Astra cosmic profile: Life Path ${result.num}, ${result.sign}, ${result.element} element, ${result.birthstone} birthstone — portalastra.com`)
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

                <ShareRow text={`I am a Life Path ${result.num} — ${result.info.name} on Portal Astra`} />

                <AmazonProductRow
                  heading="Explore your path deeper"
                  searchQuery="numerology life path guide"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Footer title="Cosmic Calendars" shareText="Explore the cosmic calendars on Portal Astra" />
    </main>
  )
}
