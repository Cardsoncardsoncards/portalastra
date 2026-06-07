'use client'

import { useState, useEffect } from 'react'
import { getMoonPhase, getAngelNumber, ANGEL_NUMBER_MEANINGS, formatDate, getTodayUTC, SIGNS } from '@/lib/utils'
import styles from './page.module.css'

type Tab = 'space' | 'earth' | 'storm' | 'stars' | 'sky' | 'neos'

const INTENSITY_COLORS: Record<string, string> = {
  extreme: '#ff4040',
  high: '#ff8c00',
  moderate: '#ffd700',
  low: '#60d090',
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

  const moon = getMoonPhase()
  const angelNum = getAngelNumber()
  const angelMeaning = ANGEL_NUMBER_MEANINGS[angelNum]
  const today = getTodayUTC()

  useEffect(() => {
    const saved = localStorage.getItem('pa_sign')
    if (saved) {
      setSign(saved)
      setSignPicked(true)
      fetchHoroscope(saved)
    }

    fetch('/api/apod').then(r => r.json()).then(setApod).catch(() => {}).finally(() => setApodLoading(false))
    fetch('/api/epic').then(r => r.json()).then(setEpic).catch(() => {}).finally(() => setEpicLoading(false))
    fetch('/api/donki').then(r => r.json()).then(d => setEvents(d.events || [])).catch(() => {}).finally(() => setDonkiLoading(false))
    fetch('/api/asteroids').then(r => r.json()).then(d => setAsteroids(d.asteroids || [])).catch(() => {}).finally(() => setAstLoading(false))
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'space', label: '🌌 Space' },
    { id: 'earth', label: '🌍 Earth' },
    { id: 'storm', label: '⚡ Solar' },
    { id: 'stars', label: '✨ Stars' },
    { id: 'sky', label: '🌙 Sky' },
    { id: 'neos', label: '☄️ NEOs' },
  ]

  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.logo}>PORTAL<span className={styles.dot}>·</span>ASTRA</h1>
            <p className={styles.tagline}>The sky, both ways · {formatDate(today)}</p>
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
          </div>
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
                <p className={styles.label}>NASA · Picture of the Day</p>
                <p className={styles.sublabel}>{formatDate(apod.date)}</p>
                <div className={styles.apodWrap}>
                  <img
                    src={apod.media_type === 'video' ? apod.thumbnail_url : apod.hdurl || apod.url}
                    alt={apod.title}
                    className={styles.apodImg}
                  />
                  <div className={styles.apodOverlay}>
                    <h2 className={styles.apodTitle}>{apod.title}</h2>
                    {apod.copyright && <p className={styles.apodCopyright}>© {apod.copyright.trim()}</p>}
                  </div>
                </div>
                <p className={styles.apodText}>{apod.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* EARTH — EPIC */}
        {tab === 'earth' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <p className={styles.label}>Earth · DSCOVR Satellite View</p>
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
            </div>
          </div>
        )}

        {/* SOLAR — DONKI */}
        {tab === 'storm' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <p className={styles.label}>Space Weather · Last 7 Days</p>
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
                      <span className={styles.eventType}>{ev.type}</span>
                      <span className={styles.eventClass}>{ev.class}</span>
                      <span className={styles.intensityBadge} style={{ color: INTENSITY_COLORS[ev.intensity], borderColor: INTENSITY_COLORS[ev.intensity] + '40', background: INTENSITY_COLORS[ev.intensity] + '15' }}>
                        {ev.intensity}
                      </span>
                    </div>
                    <p className={styles.eventDesc}>{ev.description}</p>
                    <p className={styles.eventTime}>{new Date(ev.time).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.card}>
              <p className={styles.label}>What does this mean?</p>
              <p className={styles.infoText}>
                Solar flares are bursts of radiation from the sun&apos;s surface. Geomagnetic storms occur when solar energy interacts with Earth&apos;s magnetic field — they can cause aurora displays visible at lower latitudes. Many spiritual traditions interpret periods of high solar activity as times of heightened energy and sensitivity.
              </p>
            </div>
          </div>
        )}

        {/* STARS — Horoscope */}
        {tab === 'stars' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <p className={styles.label}>Daily Horoscope</p>
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* SKY — Bridge */}
        {tab === 'sky' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <p className={styles.label}>The Sky Speaks</p>
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
                    <p className={styles.skyItemName}>{events[0].type}</p>
                    <p className={styles.skyItemSub}>{events[0].intensity} intensity</p>
                  </div>
                )}
              </div>
              {apod && (
                <div className={styles.skyBridge}>
                  <p className={styles.skyBridgeText}>
                    Tonight NASA shows us <em>&quot;{apod.title}&quot;</em>. {angelMeaning.message} {events.length > 0 ? `The sun has been active this week — ${events[0].description.toLowerCase()}` : 'The sun is calm, grounding energy is available.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEOs */}
        {tab === 'neos' && (
          <div className={styles.panel}>
            <div className={styles.card}>
              <p className={styles.label}>Near-Earth Objects · Today</p>
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
              <p className={styles.label}>What is &quot;hazardous&quot;?</p>
              <p className={styles.infoText}>A potentially hazardous asteroid is larger than ~140 metres and passes within 7.5 million km of Earth&apos;s orbit. This does not mean an impact is imminent — NASA tracks all such objects continuously and none currently pose a threat.</p>
            </div>
          </div>
        )}

        <footer className={styles.footer}>
          <p>Astronomy data: NASA Open APIs (APOD, NeoWs, DONKI, EPIC) · Horoscope: freehoroscopeapi</p>
          <p>Horoscope, tarot, and spiritual content is for entertainment and personal reflection only.</p>
        </footer>
      </div>
    </main>
  )
}
