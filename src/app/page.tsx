'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getMoonPhase, getAngelNumber, ANGEL_NUMBER_MEANINGS, formatDate, getTodayUTC, SIGNS } from '@/lib/utils'
import { getDailyCard, getWeeklySpread, TAROT_DECK, type DrawnCard } from '@/lib/tarot'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from './page.module.css'

type Tab = 'space' | 'earth' | 'storm' | 'stars' | 'sky' | 'tarot' | 'neos'

const INTENSITY_COLORS: Record<string, string> = {
  extreme: '#ff4040',
  high: '#ff8c00',
  moderate: '#ffd700',
  low: '#60d090',
}

// Plain English names for NASA DONKI event type codes
const EVENT_TYPE_NAMES: Record<string, string> = {
  CME: 'Coronal Mass Ejection',
  FLR: 'Solar Flare',
  GST: 'Geomagnetic Storm',
  IPS: 'Interplanetary Shockwave',
  MPC: 'Magnetopause Crossing',
  RBE: 'Radiation Belt Enhancement',
  HSS: 'High-Speed Solar Wind',
  SEP: 'Solar Energetic Particles',
  WSA: 'Solar Wind Event',
}

// Plain English for intensity levels and NOAA scales
const INTENSITY_LABELS: Record<string, string> = {
  low:      'mild \u2014 no significant impact on daily life',
  moderate: 'moderate \u2014 minor effects on satellites and radio signals possible',
  high:     'strong \u2014 auroras may be visible at higher latitudes',
  extreme:  'severe \u2014 potential disruptions to GPS and power grids',
  // NOAA geomagnetic storm scale
  G1: 'minor geomagnetic storm',
  G2: 'moderate geomagnetic storm \u2014 auroras possible at high latitudes',
  G3: 'strong geomagnetic storm \u2014 auroras may reach mid-latitudes',
  G4: 'severe geomagnetic storm \u2014 widespread aurora and GPS disruption possible',
  G5: 'extreme geomagnetic storm \u2014 rare, major infrastructure impacts possible',
  // NOAA solar radiation scale
  S1: 'minor solar radiation storm',
  S2: 'moderate solar radiation storm \u2014 some satellite issues possible',
  S3: 'strong solar radiation storm \u2014 passengers on polar flights may receive elevated radiation',
  S4: 'severe solar radiation storm \u2014 satellite damage possible',
  S5: 'extreme solar radiation storm \u2014 very rare, widespread satellite disruption',
  // NOAA radio blackout scale
  R1: 'minor radio blackout \u2014 brief HF radio disruption',
  R2: 'moderate radio blackout \u2014 limited shortwave radio impact',
  R3: 'strong radio blackout \u2014 shortwave radio outages on sunlit side of Earth',
  R4: 'severe radio blackout \u2014 significant disruption to navigation and communication',
  R5: 'extreme radio blackout \u2014 complete HF radio blackout possible',
}

// Solar humaniser — converts a raw DONKI event into a plain English sentence
function humaniseSolarEvent(ev: { type?: string; intensity?: string; description?: string } | null): string {
  if (!ev) return 'The sun is calm. Grounding energy is available.'

  const typeName = ev.type
    ? (EVENT_TYPE_NAMES[ev.type.toUpperCase()] || ev.type)
    : 'Solar activity'

  const intensityLabel = ev.intensity
    ? (INTENSITY_LABELS[ev.intensity] || ev.intensity)
    : null

  if (!intensityLabel) {
    return `${typeName} was detected in the past 7 days. Intensity not yet classified by NASA.`
  }

  return `${typeName} was detected in the past 7 days \u2014 ${intensityLabel}.`
}

// Short label for the Sky grid tile (one line only)
function solarTileLabel(ev: { type?: string } | null): string {
  if (!ev || !ev.type) return 'Solar activity'
  return EVENT_TYPE_NAMES[ev.type.toUpperCase()] || ev.type
}

// Open a share dialog in a small popup window instead of a full tab.
function openSharePopup(shareUrl: string) {
  window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer')
}

// Coloured social share row, reused by every tab. Manages its own
// "Copied" confirmation so multiple rows don't share state. Pinterest,
// Reddit and the email subject are opt-in per tab.
function ShareButtons({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent

  // Platforms that don't take a separate URL field need it inside the text.
  const textWithUrl = `${text} ${url}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${enc(textWithUrl)}`
  const redditUrl = `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(text)}`

  return (
    <div className={styles.shareRow}>
      <a
        className={styles.shareBtn}
        style={{ background: '#1877F2', borderColor: '#1877F2', color: '#fff' }}
        href={fbUrl}
        onClick={(e) => { e.preventDefault(); openSharePopup(fbUrl) }}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.shareIcon}>f</span> Facebook
      </a>
      <a
        className={styles.shareBtn}
        style={{ background: '#000000', borderColor: '#000000', color: '#fff' }}
        href={xUrl}
        onClick={(e) => { e.preventDefault(); openSharePopup(xUrl) }}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.shareIcon}>𝕏</span> Post
      </a>
      <a
        className={styles.shareBtn}
        style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
        href={`https://wa.me/?text=${enc(textWithUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.shareIcon}>💬</span> WhatsApp
      </a>
      <a
        className={styles.shareBtn}
        style={{ background: '#FF4500', borderColor: '#FF4500', color: '#fff' }}
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.shareIcon}>r</span> Reddit
      </a>
      <button
        className={styles.shareBtn}
        style={{ background: '#b8a4ff', borderColor: '#b8a4ff', color: '#07070d' }}
        onClick={copy}
      >
        <span className={styles.shareIcon}>{copied ? '✓' : '🔗'}</span> {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}

// Standard numerology reduction to a single digit (1–9).
function reduceToDigit(n: number): number {
  while (n > 9) {
    n = n.toString().split('').reduce((a, b) => a + Number(b), 0)
  }
  return n
}

// Final reduction that preserves the master numbers 11, 22 and 33.
function reduceKeepMaster(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split('').reduce((a, b) => a + Number(b), 0)
  }
  return n
}

function lifePathNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return reduceKeepMaster(reduceToDigit(y) + reduceToDigit(m) + reduceToDigit(d))
}

// Draw 3 unique random cards (each random orientation), excluding any names
// already used by today's daily card and the weekly spread.
function drawPersonal(exclude: Set<string>): DrawnCard[] {
  const pool = TAROT_DECK.filter((c) => !exclude.has(c.name))
  const picked: DrawnCard[] = []
  const used = new Set<string>()
  while (picked.length < 3 && used.size < pool.length) {
    const card = pool[Math.floor(Math.random() * pool.length)]
    if (used.has(card.name)) continue
    used.add(card.name)
    const reversed = Math.random() < 0.5
    picked.push({
      ...card,
      orientation: reversed ? 'Reversed' : 'Upright',
      meaning: reversed ? card.reversed : card.upright,
    })
  }
  return picked
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('space')

  // APOD
  const [apod, setApod] = useState<any>(null)
  const [apodLoading, setApodLoading] = useState(true)

  // EPIC
  const [epic, setEpic] = useState<any>(null)
  const [epicLoading, setEpicLoading] = useState(true)

  // DONKI
  const [events, setEvents] = useState<any[]>([])
  const [donkiLoading, setDonkiLoading] = useState(true)

  // NEOs
  const [asteroids, setAsteroids] = useState<any[]>([])
  const [astLoading, setAstLoading] = useState(true)

  // Horoscope
  const [sign, setSign] = useState<string | null>(null)
  const [reading, setReading] = useState('')
  const [horoLoading, setHoroLoading] = useState(false)
  const [signPicked, setSignPicked] = useState(false)

  // Email capture
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeNote, setSubscribeNote] = useState<{ ok: boolean; msg: string } | null>(null)

  // UI bits
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [copiedReading, setCopiedReading] = useState(false)

  // Tarot
  const [weeklyRevealed, setWeeklyRevealed] = useState(false)
  const [tarotNoticeDismissed, setTarotNoticeDismissed] = useState(true)
  const [personalDraw, setPersonalDraw] = useState<DrawnCard[] | null>(null)
  const [copiedTarot, setCopiedTarot] = useState(false)

  // Life path calculator
  const [birthDate, setBirthDate] = useState('')

  // Parallax star background
  const starsRef = useRef<HTMLDivElement>(null)

  const moon = getMoonPhase()
  const angelNum = getAngelNumber()
  const angelMeaning = ANGEL_NUMBER_MEANINGS[angelNum]
  const today = getTodayUTC()

  // Share the live canonical URL (set on client) rather than a hardcoded host.
  const [shareUrl, setShareUrl] = useState('https://portalastra.com')
  useEffect(() => { setShareUrl(window.location.href) }, [])

  const daily = getDailyCard(today)
  const weekly = getWeeklySpread(today)

  const birthDateInFuture = !!birthDate && birthDate > today
  const lifePath = birthDate && !birthDateInFuture ? lifePathNumber(birthDate) : null
  const lifePathMeaning = lifePath ? ANGEL_NUMBER_MEANINGS[lifePath] : null

  // Social sharing: title reflects whichever tab is currently active (and its
  // live data); shareUrl (above) is the live canonical URL.
  const TAB_SHARE: Record<Tab, string> = {
    space: "Check out today's NASA Picture of the Day on Portal Astra",
    earth: 'See Earth from a million miles away on Portal Astra',
    storm: 'Live space weather on Portal Astra',
    stars: sign
      ? `I just read my ${sign} horoscope on Portal Astra`
      : 'I just read my horoscope on Portal Astra',
    sky: `Tonight is a ${moon.name} moon \u2014 Portal Astra`,
    tarot: `I drew ${daily.name} in my tarot reading on Portal Astra`,
    neos: 'Tracking near-Earth asteroids live on Portal Astra',
  }
  const shareTitle = TAB_SHARE[tab]

  useEffect(() => {
    const saved = localStorage.getItem('pa_sign')
    if (saved) {
      setSign(saved)
      setSignPicked(true)
      fetchHoroscope(saved)
    }

    // Tarot disclaimer shows once per browser session.
    if (!sessionStorage.getItem('pa_tarot_notice')) {
      setTarotNoticeDismissed(false)
    }

    fetch('/api/apod').then(r => r.json()).then(setApod).catch(() => {}).finally(() => setApodLoading(false))
    fetch('/api/epic').then(r => r.json()).then(setEpic).catch(() => {}).finally(() => setEpicLoading(false))
    fetch('/api/donki').then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => {}).finally(() => setDonkiLoading(false))
    fetch('/api/asteroids').then(r => r.json()).then(d => setAsteroids(d.asteroids || [])).catch(() => {}).finally(() => setAstLoading(false))
  }, [])

  // Parallax: drift the fixed star layer at 0.3x scroll speed
  useEffect(() => {
    const onScroll = () => {
      if (starsRef.current) {
        starsRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fetchHoroscope = async (s: string) => {
    setHoroLoading(true)
    try {
      const r = await fetch(`/api/horoscope?sign=${s.toLowerCase()}`)
      const d = await r.json()
      setReading(d.reading)
    } catch {}
    setHoroLoading(false)
  }

  const pickSign = (s: string) => {
    setSign(s)
    setSignPicked(true)
    localStorage.setItem('pa_sign', s)
    fetchHoroscope(s)
  }

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (subscribing) return
    setSubscribing(true)
    setSubscribeNote(null)
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website: honeypot }),
      })
      const d = await r.json()
      if (r.ok) {
        setSubscribeNote({ ok: true, msg: "You're in ✦" })
        setEmail('')
      } else {
        setSubscribeNote({ ok: false, msg: d.error || 'Something went wrong.' })
      }
    } catch {
      setSubscribeNote({ ok: false, msg: 'Network error \u2014 try again.' })
    }
    setSubscribing(false)
  }

  const copyReading = async () => {
    if (!sign || !reading) return
    try {
      await navigator.clipboard.writeText(`${sign}\n\n${reading}`)
      setCopiedReading(true)
      setTimeout(() => setCopiedReading(false), 2000)
    } catch {}
  }

  const dismissTarotNotice = () => {
    sessionStorage.setItem('pa_tarot_notice', '1')
    setTarotNoticeDismissed(true)
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'space', label: '🌌 Space' },
    { id: 'earth', label: '🌍 Earth' },
    { id: 'storm', label: '⚡ Solar' },
    { id: 'stars', label: '✨ Stars' },
    { id: 'sky', label: '🌙 Sky' },
    { id: 'tarot', label: '🃏 Tarot' },
    { id: 'neos', label: '☄️ NEOs' },
  ]

  return (
    <main className={styles.main}>
      <div ref={starsRef} className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <Navbar />
        <h1 className={styles.srOnly}>Portal Astra &mdash; your daily cosmic guide</h1>
        <header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/images/portalastralogosquare.png"
              alt="Portal Astra"
              style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(155,138,255,0.5))', borderRadius: '8px' }}
            />
            <div className={styles.heroText}>
              <h2 className={styles.heroTitle}>Where Science Meets the Stars</h2>
              <p className={styles.heroSub}>ASTRONOMY · GUIDANCE · DISCOVERY</p>
              <p className={styles.heroDate}>{formatDate(today)}</p>
            </div>
          </div>
          <div className={styles.moonBadge}>
            <span className={styles.moonEmoji}>{moon.emoji}</span>
            <span className={styles.moonName}>{moon.name}</span>
          </div>
        </header>

        {/* Angel number strip */}
        <div className={styles.angelStrip}>
          <span className={styles.angelNum}>{angelNum}</span>
          <div>
            <p className={styles.angelTheme}>Today&apos;s number · {angelMeaning.theme}</p>
            <p className={styles.angelMsg}>{angelMeaning.message}</p>
            <Link href="/calendars#birth" className={styles.lifePathLink}>Discover your life path number →</Link>
          </div>
        </div>

        {/* Email capture strip */}
        <div className={styles.emailStrip}>
          <form className={styles.emailForm} onSubmit={subscribe}>
            {/* Honeypot — hidden from real users, catches bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            <input
              type="email"
              className={styles.emailInput}
              placeholder="you@example.com"
              aria-label="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className={styles.emailBtn} disabled={subscribing}>
              {subscribing ? 'Joining...' : 'Get the cosmos in your inbox weekly'}
            </button>
          </form>
          <p className={styles.consentNote}>
            By subscribing you agree to our <Link href="/privacy">Privacy Policy</Link>.
          </p>
          {subscribeNote && (
            <p className={`${styles.emailNote} ${subscribeNote.ok ? styles.emailNoteOk : styles.emailNoteErr}`}>
              {subscribeNote.msg}
            </p>
          )}
        </div>

        {/* Tabs */}
        <nav className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* SPACE — APOD */}
        {tab === 'space' && (
          <div className={styles.panel}>
            {apodLoading && <div className={styles.card}><div className={styles.skeleton} /></div>}
            {!apodLoading && apod && !apod.error && (
              <div className={styles.card}>
                <h2 className={styles.label} aria-label="NASA Astronomy Picture of the Day">NASA · Picture of the Day</h2>
                <p className={styles.sublabel}>{formatDate(apod.date)}</p>
                <div className={styles.apodWrap}>
                  <img
                    src={apod.media_type === 'video' ? apod.thumbnail_url : apod.hdurl || apod.url}
                    alt={apod.title}
                    className={styles.apodImg}
                    onClick={() => setLightboxOpen(true)}
                  />
                  <div className={styles.apodOverlay}>
                    <h2 className={styles.apodTitle}>{apod.title}</h2>
                    {apod.copyright && <p className={styles.apodCopyright}>© {apod.copyright.trim()}</p>}
                  </div>
                </div>
                <p className={styles.apodText}>{apod.explanation}</p>
              </div>
            )}
            {!apodLoading && (!apod || apod.error) && (
              <div className={`${styles.card} ${styles.fallbackCard}`}>
                <p className={styles.fallbackEmoji}>🌌</p>
                <p className={styles.fallbackMsg}>Imagery temporarily unavailable &mdash; check back shortly</p>
              </div>
            )}          </div>
        )}

        {/* EARTH — EPIC */}
        {tab === 'earth' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Earth from the DSCOVR satellite">Earth · DSCOVR Satellite View</h2>
              <p className={styles.sublabel}>Daily full-disc image of Earth from 1.5 million km away</p>
              {epicLoading && <div className={styles.skeleton} />}
              {!epicLoading && epic && !epic.error && (
                <>
                  <div className={styles.epicWrap}>
                    <img
                      src={epic.imageUrl}
                      alt="Earth from DSCOVR satellite"
                      className={styles.epicImg}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                  <p className={styles.epicDate}>{epic.date}</p>
                  <p className={styles.epicNote}>EPIC imagery is typically 24&ndash;48 hours delayed</p>
                  {epic.caption && <p className={styles.apodText}>{epic.caption}</p>}
                  <div className={styles.epicStats}>
                    {epic.coords && (
                      <>
                        <div className={styles.epicStat}>
                          <span className={styles.epicStatLabel}>Latitude</span>
                          <span className={styles.epicStatVal}>{epic.coords.lat?.toFixed(2)}°</span>
                        </div>
                        <div className={styles.epicStat}>
                          <span className={styles.epicStatLabel}>Longitude</span>
                          <span className={styles.epicStatVal}>{epic.coords.lon?.toFixed(2)}°</span>
                        </div>
                      </>
                    )}
                    <div className={styles.epicStat}>
                      <span className={styles.epicStatLabel}>Distance</span>
                      <span className={styles.epicStatVal}>~1.5M km</span>
                    </div>
                  </div>
                </>
              )}
              {!epicLoading && (!epic || epic.error) && (
                <p className={styles.empty}>Earth imagery temporarily unavailable. NASA updates this daily.</p>
              )}
            </div>          </div>
        )}

        {/* SOLAR — DONKI */}
        {tab === 'storm' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Space weather over the last 7 days">Space Weather · Last 7 Days</h2>
              <p className={styles.sublabel}>Solar flares, geomagnetic storms, and coronal mass ejections</p>
              {donkiLoading && <div className={styles.skeleton} />}
              {!donkiLoading && events.length === 0 && (
                <div className={styles.quietSky}>
                  <p className={styles.quietEmoji}>🌞</p>
                  <p className={styles.quietTitle}>The sun is quiet</p>
                  <p className={styles.quietMsg}>No significant space weather events in the past 7 days. Calm skies both above and within.</p>
                </div>
              )}
              {!donkiLoading && events.map((ev, i) => (
                <div key={i} className={styles.eventRow} style={{ borderBottom: i < events.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className={styles.eventDot} style={{ background: INTENSITY_COLORS[ev.intensity] || '#9b8aff' }} />
                  <div className={styles.eventBody}>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventEmoji}>{ev.emoji}</span>
                      <span className={styles.eventType}>{EVENT_TYPE_NAMES[ev.type?.toUpperCase()] || ev.type}</span>
                      <span className={styles.eventClass}>{ev.class}</span>
                      <span className={styles.intensityBadge} style={{ color: INTENSITY_COLORS[ev.intensity], borderColor: INTENSITY_COLORS[ev.intensity] + '40', background: INTENSITY_COLORS[ev.intensity] + '15' }}>
                        {ev.intensity}
                      </span>
                    </div>
                    <p className={styles.eventDesc}>{humaniseSolarEvent(ev)}</p>
                    <p className={styles.eventTime}>{new Date(ev.time).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="What does this mean?">What does this mean?</h2>
              <p className={styles.infoText}>
                Solar flares are bursts of radiation from the sun&apos;s surface. Geomagnetic storms occur when solar energy interacts with Earth&apos;s magnetic field &mdash; they can cause aurora displays visible at lower latitudes. Many spiritual traditions interpret periods of high solar activity as times of heightened energy and sensitivity.
              </p>
            </div>          </div>
        )}

        {/* STARS — Horoscope */}
        {tab === 'stars' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Daily horoscope">Daily Horoscope</h2>
              <p className={styles.sublabel}>{moon.emoji} {moon.name} · {formatDate(today)}</p>
              {!signPicked && (
                <>
                  <p className={styles.pickPrompt}>Select your sign to receive today&apos;s reading</p>
                  <div className={styles.signGrid}>
                    {SIGNS.map(s => (
                      <button key={s.name} className={styles.signBtn} onClick={() => pickSign(s.name)}>
                        <span className={styles.signEmoji}>{s.emoji}</span>
                        <span className={styles.signName}>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {signPicked && sign && (
                <div className={styles.readingWrap}>
                  <div className={styles.signHeader}>
                    <span className={styles.signBigEmoji}>{SIGNS.find(s => s.name === sign)?.emoji}</span>
                    <div>
                      <p className={styles.signBigName}>{sign}</p>
                      <p className={styles.signDetails}>{SIGNS.find(s => s.name === sign)?.dates} · {SIGNS.find(s => s.name === sign)?.element} · ruled by {SIGNS.find(s => s.name === sign)?.ruling}</p>
                    </div>
                    <button className={styles.changeBtn} onClick={() => { setSignPicked(false); setReading('') }}>Change</button>
                  </div>
                  {horoLoading && <div className={styles.skeleton} style={{ height: 80 }} />}
                  {!horoLoading && reading && <p className={styles.reading}>{reading}</p>}
                  {!horoLoading && reading && (
                    <button
                      className={`${styles.copyBtn} ${copiedReading ? styles.copyBtnDone : ''}`}
                      onClick={copyReading}
                    >
                      {copiedReading ? '✓ Copied' : 'Copy reading'}
                    </button>
                  )}
                  {!horoLoading && !reading && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <p className={styles.quietMsg} style={{ marginBottom: 14 }}>Today&apos;s reading is resting between the stars. Try again in a moment.</p>
                      <button className={styles.changeBtn} style={{ margin: '0 auto' }} onClick={() => fetchHoroscope(sign!)}>Retry</button>
                    </div>
                  )}
                </div>
              )}
            </div>          </div>
        )}

        {/* SKY — Bridge */}
        {tab === 'sky' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="The sky speaks">The Sky Speaks</h2>
              <p className={styles.sublabel}>Where astronomy meets astrology</p>
              <div className={styles.skyGrid}>
                <div className={styles.skyItem}>
                  <p className={styles.skyItemLabel}>Moon Phase</p>
                  <p className={styles.skyBigEmoji}>{moon.emoji}</p>
                  <p className={styles.skyItemName}>{moon.name}</p>
                  <p className={styles.skyItemSub}>~{moon.illumination}% illuminated</p>
                </div>
                <div className={styles.skyItem}>
                  <p className={styles.skyItemLabel}>Angel Number</p>
                  <p className={styles.skyBigNum}>{angelNum}</p>
                  <p className={styles.skyItemName}>{angelMeaning.theme}</p>
                  <p className={styles.skyItemSub}>{formatDate(today)}</p>
                </div>
                {sign && (
                  <div className={styles.skyItem}>
                    <p className={styles.skyItemLabel}>Your Sign</p>
                    <p className={styles.skyBigEmoji}>{SIGNS.find(s => s.name === sign)?.emoji}</p>
                    <p className={styles.skyItemName}>{sign}</p>
                    <p className={styles.skyItemSub}>{SIGNS.find(s => s.name === sign)?.element}</p>
                  </div>
                )}
                {events.length > 0 && (
                  <div className={styles.skyItem}>
                    <p className={styles.skyItemLabel}>Solar Activity</p>
                    <p className={styles.skyBigEmoji}>☀️</p>
                    <p className={styles.skyItemName}>{solarTileLabel(events[0])}</p>
                    <p className={styles.skyItemSub}>{events[0].intensity} intensity</p>
                  </div>
                )}
              </div>
              {apod && (
                <div className={styles.skyBridge}>
                  <p className={styles.skyBridgeText}>
                    {apod && apod.title ? <>Tonight NASA shows us <em>&quot;{apod.title}&quot;</em>. </> : null}
                    {angelMeaning.message} {events.length > 0 ? humaniseSolarEvent(events[0]) : 'The sun is calm, grounding energy is available.'}
                  </p>
                </div>
              )}

              {/* Life path number calculator */}
              <div className={styles.lifePath}>
                <h2 className={styles.label} aria-label="Life path number calculator">Life Path Number</h2>
                <p className={styles.sublabel}>Enter your birth date to find your core numerology number</p>
                <div className={styles.lifePathRow}>
                  <input
                    type="date"
                    className={styles.lifePathInput}
                    aria-label="Birth date"
                    value={birthDate}
                    max={today}
                    onChange={e => setBirthDate(e.target.value)}
                  />
                </div>
                {birthDateInFuture && (
                  <p className={styles.lifePathError}>Please enter a date in the past &mdash; your birth date can&apos;t be in the future.</p>
                )}
                {lifePath && lifePathMeaning && (
                  <div className={styles.lifePathResult}>
                    <span className={styles.lifePathNum}>{lifePath}</span>
                    <div>
                      <p className={styles.lifePathTheme}>Life Path {lifePath} · {lifePathMeaning.theme}</p>
                      <p className={styles.lifePathMsg}>{lifePathMeaning.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>          </div>
        )}

        {/* TAROT */}
        {tab === 'tarot' && (
          <div className={styles.panel}>
            {!tarotNoticeDismissed && (
              <div className={styles.tarotNotice}>
                <p className={styles.tarotNoticeText}>Tarot readings are for entertainment and personal reflection only.</p>
                <button className={styles.tarotNoticeClose} onClick={dismissTarotNotice} aria-label="Dismiss notice">✕</button>
              </div>
            )}
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Tarot card of the day">Tarot · Card of the Day</h2>
              <p className={styles.sublabel}>{formatDate(today)} · everyone draws the same card today</p>
              <div className={styles.tarotCardFace}>
                <span className={styles.tarotEmoji}>{daily.emoji}</span>
                <div>
                  <p className={styles.tarotMeta}>
                    {daily.arcana === 'Major' ? 'Major Arcana' : `Minor Arcana · ${daily.arcana}`} · {daily.theme}
                  </p>
                  <h2 className={styles.tarotName}>
                    {daily.name}{' '}
                    <span className={`${styles.tarotOrient} ${daily.orientation === 'Reversed' ? styles.tarotOrientReversed : ''}`}>
                      {daily.orientation}
                    </span>
                  </h2>
                  <p className={styles.tarotMeaning}>{daily.meaning}</p>
                </div>
              </div>
              <button
                className={styles.changeBtn}
                style={{ margin: '0.75rem auto 0', display: 'block' }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`I drew the ${daily.name} on Portal Astra today — portalastra.com`)
                    setCopiedTarot(true)
                    setTimeout(() => setCopiedTarot(false), 2000)
                  } catch {}
                }}
              >
                {copiedTarot ? 'Copied!' : 'Share this card'}
              </button>
              <p className={styles.tarotNote}>Today&apos;s card is drawn collectively. Your personal interpretation is what matters.</p>
            </div>

            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Weekly tarot spread">Weekly Spread · Past · Present · Future</h2>
              <p className={styles.sublabel}>One reading for the whole week</p>
              {!weeklyRevealed && (
                <button className={styles.revealBtn} onClick={() => setWeeklyRevealed(true)}>
                  🔮 Reveal weekly spread
                </button>
              )}
              {weeklyRevealed && (
                <div className={styles.spreadGrid}>
                  {([['Past', weekly.past], ['Present', weekly.present], ['Future', weekly.future]] as const).map(([pos, c]) => (
                    <div key={pos} className={styles.spreadCard}>
                      <p className={styles.spreadPos}>{pos}</p>
                      <p className={styles.spreadEmoji}>{c.emoji}</p>
                      <p className={styles.spreadName}>{c.name}</p>
                      <p className={styles.spreadOrient}>{c.orientation}</p>
                      <p className={styles.spreadMeaning}>{c.meaning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Your personal tarot draw">Your Personal Draw · Draw Any Time</h2>
              <p className={styles.sublabel}>Three cards drawn for you alone. Redraw whenever you feel called.</p>
              {!personalDraw && (
                <button
                  className={styles.revealBtn}
                  onClick={() => setPersonalDraw(drawPersonal(new Set([daily.name, weekly.past.name, weekly.present.name, weekly.future.name])))}
                >
                  🃏 Draw my cards
                </button>
              )}
              {personalDraw && (
                <>
                  <div className={styles.spreadGrid}>
                    {personalDraw.map((c, i) => (
                      <div key={i} className={styles.spreadCard}>
                        <p className={styles.spreadPos}>Card {i + 1}</p>
                        <p className={styles.spreadEmoji}>{c.emoji}</p>
                        <p className={styles.spreadName}>{c.name}</p>
                        <p className={styles.spreadOrient}>{c.orientation}</p>
                        <p className={styles.spreadMeaning}>{c.meaning}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    className={styles.revealBtn}
                    style={{ marginTop: '1rem' }}
                    onClick={() => setPersonalDraw(drawPersonal(new Set([daily.name, weekly.past.name, weekly.present.name, weekly.future.name])))}
                  >
                    🔄 Redraw
                  </button>
                  <div style={{ marginTop: '1rem' }}>
                    <ShareButtons
                      text={`I just drew ${personalDraw[0].name}, ${personalDraw[1].name} and ${personalDraw[2].name} in my personal tarot reading on Portal Astra`}
                      url={shareUrl}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* NEOs */}
        {tab === 'neos' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="Near-Earth objects today">Near-Earth Objects · {asteroids.length > 0 ? formatDate(asteroids[0].close_approach_data[0].close_approach_date) : formatDate(today)}</h2>
              <p className={styles.sublabel}>Sorted by closest approach distance</p>
              {astLoading && <div className={styles.skeleton} />}
              {!astLoading && asteroids.length === 0 && <p className={styles.empty}>No close approaches today.</p>}
              {!astLoading && asteroids.map((a, i) => {
                const ca = a.close_approach_data[0]
                const dist = (+ca.miss_distance.kilometers).toLocaleString('en-AU', { maximumFractionDigits: 0 })
                const vel = (+ca.relative_velocity.kilometers_per_hour).toLocaleString('en-AU', { maximumFractionDigits: 0 })
                const d = a.estimated_diameter.meters
                const avg = ((d.estimated_diameter_min + d.estimated_diameter_max) / 2).toFixed(0)
                return (
                  <div key={a.id} className={styles.neo} style={{ borderBottom: i < asteroids.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div className={styles.neoDot} style={{ background: a.is_potentially_hazardous_asteroid ? '#ff6060' : '#60d090' }} />
                    <div>
                      <div className={styles.neoName}>
                        {a.name.replace(/[()]/g, '')}
                        {a.is_potentially_hazardous_asteroid && <span className={styles.hazBadge}>⚠ HAZARDOUS</span>}
                      </div>
                      <div className={styles.neoStats}>
                        <span>{dist} km away</span>
                        <span>{vel} km/h</span>
                        <span>~{avg} m wide</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={styles.card}>
              <h2 className={styles.label} aria-label="What is a hazardous asteroid?">What is &quot;hazardous&quot;?</h2>
              <p className={styles.infoText}>A potentially hazardous asteroid is larger than ~140 metres and passes within 7.5 million km of Earth&apos;s orbit. This does not mean an impact is imminent &mdash; NASA tracks all such objects continuously and none currently pose a threat.</p>
            </div>
          </div>
        )}

        {/* Share row — reflects the active tab, rendered at the bottom of every panel */}
        <ShareButtons text={shareTitle} url={shareUrl} />

        {/* APOD lightbox */}
        {lightboxOpen && apod && !apod.error && (
          <div className={styles.lightbox} onClick={() => setLightboxOpen(false)}>
            <img
              src={apod.media_type === 'video' ? apod.thumbnail_url : apod.hdurl || apod.url}
              alt={apod.title}
              className={styles.lightboxImg}
            />
            <p className={styles.lightboxTitle}>{apod.title}</p>
          </div>
        )}

      </div>
      <Footer />
    </main>
  )
}
