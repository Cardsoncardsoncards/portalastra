'use client'

// PlantingCalendar.tsx, Premium component
// Drop into src/app/calendars/page.tsx, replacing the existing planting grid
// Requires: getMoonPhase from @/lib/shared

import { getMoonPhase } from '@/lib/shared'

type PhaseKey = 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous' | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent'

interface PhaseData {
  emoji: string
  energy: string
  tagline: string
  colour: string
  goldBorder: boolean
  sow: string[]
  avoid: string[]
  tasks: string[]
  zodiacBest: string
  ritual: string
  daysRemaining: number
}

const PHASE_DATA: Record<PhaseKey, Omit<PhaseData, 'daysRemaining'>> = {
  'New Moon': {
    emoji: '🌑',
    energy: 'Rest & Intention',
    tagline: 'The soil drinks in darkness. Set your intentions before breaking ground.',
    colour: '#1a1040',
    goldBorder: false,
    sow: ['Nothing, this is a rest phase'],
    avoid: ['Transplanting', 'Harvesting', 'Pruning'],
    tasks: ['Prepare soil', 'Add compost', 'Plan your garden layout', 'Set intentions for the season'],
    zodiacBest: 'Cancer, Scorpio, Pisces',
    ritual: 'Write what you want to grow, in the garden and in your life, before you sleep.',
  },
  'Waxing Crescent': {
    emoji: '🌒',
    energy: 'Rising Vitality',
    tagline: 'Sap rises with the moon. Leafy greens and herbs drink this light deeply.',
    colour: '#0f1a2e',
    goldBorder: false,
    sow: ['Leafy greens (spinach, lettuce, kale)', 'Herbs (basil, coriander, parsley)', 'Annual flowers', 'Cabbage family'],
    avoid: ['Root vegetables', 'Bulbs'],
    tasks: ['Sow seeds', 'Plant seedlings', 'Water generously', 'Start new garden beds'],
    zodiacBest: 'Taurus, Cancer, Libra, Scorpio',
    ritual: 'Water your seeds at dawn. Speak what you want them to become.',
  },
  'First Quarter': {
    emoji: '🌓',
    energy: 'Growth Force',
    tagline: 'Tension drives expansion. Fruiting crops respond to this charged energy.',
    colour: '#0f1a2e',
    goldBorder: false,
    sow: ['Fruiting crops (tomatoes, capsicum, cucumber)', 'Beans and peas', 'Grains and cereals', 'Squash and zucchini'],
    avoid: ['Root vegetables', 'Bulb planting'],
    tasks: ['Transplant seedlings', 'Fertilise above-ground plants', 'Stake and support crops', 'Prune for shape'],
    zodiacBest: 'Aries, Leo, Sagittarius',
    ritual: 'Touch the soil with both hands. Feel the energy moving upward through your palms.',
  },
  'Waxing Gibbous': {
    emoji: '🌔',
    energy: 'Peak Nourishment',
    tagline: 'Nutrients and moisture move upward. Tend, feed, and support everything growing.',
    colour: '#0f1a2e',
    goldBorder: false,
    sow: ['Fruiting vegetables', 'Climbing plants', 'Melons'],
    avoid: ['Root crops', 'Bulbs'],
    tasks: ['Deep watering', 'Apply liquid fertiliser', 'Tie and train climbers', 'Watch for pests, plants are most vulnerable'],
    zodiacBest: 'Taurus, Cancer, Virgo',
    ritual: 'Feed your plants at golden hour. Thank them for what they are becoming.',
  },
  'Full Moon': {
    emoji: '🌕',
    energy: 'Harvest & Celebration',
    tagline: 'Maximum moisture in the soil. Harvest now for the highest vitality and flavour.',
    colour: '#1a1500',
    goldBorder: true,
    sow: ['Leafy greens for immediate harvest', 'Annual herbs'],
    avoid: ['New plantings', 'Transplanting'],
    tasks: ['Harvest fruits and vegetables', 'Cut herbs for drying', 'Gather seeds', 'Harvest medicinal plants at peak potency'],
    zodiacBest: 'Cancer, Scorpio, Pisces, Taurus',
    ritual: 'Harvest in the early morning while the moon is still visible. Hold what you have grown and give thanks.',
  },
  'Waning Gibbous': {
    emoji: '🌖',
    energy: 'Root Deepening',
    tagline: 'Energy moves downward into roots. Underground crops absorb nutrients now.',
    colour: '#12101a',
    goldBorder: false,
    sow: ['Root vegetables (carrots, beetroot, turnip)', 'Potatoes', 'Garlic and onions', 'Bulbs'],
    avoid: ['Leafy greens', 'Fruiting crops'],
    tasks: ['Plant root crops', 'Add root-feeding nutrients', 'Weed thoroughly', 'Apply mulch'],
    zodiacBest: 'Capricorn, Taurus, Virgo',
    ritual: 'Press your hands into the earth. Breathe out what no longer serves your growth.',
  },
  'Last Quarter': {
    emoji: '🌗',
    energy: 'Clearing & Release',
    tagline: 'The moon releases. Clear, compost, and prepare the soil for the next cycle.',
    colour: '#12101a',
    goldBorder: false,
    sow: ['Root vegetables', 'Garlic', 'Perennial herbs'],
    avoid: ['Planting anything new, energy is clearing'],
    tasks: ['Weed deeply', 'Prune and deadhead', 'Turn compost', 'Remove diseased plants', 'Aerate soil'],
    zodiacBest: 'Scorpio, Capricorn, Virgo',
    ritual: 'Remove something from your garden that is not thriving. Let it go without guilt.',
  },
  'Waning Crescent': {
    emoji: '🌘',
    energy: 'Deep Rest',
    tagline: 'The cycle closes. Rest the soil and your hands. Reflect on what you grew.',
    colour: '#12101a',
    goldBorder: false,
    sow: ['Garlic cloves', 'Bulbs for next season'],
    avoid: ['Most planting, this is a rest phase'],
    tasks: ['Rest the soil', 'Prepare beds for the new cycle', 'Spread compost', 'Plan what to plant at New Moon'],
    zodiacBest: 'Pisces, Cancer',
    ritual: 'Sit in the garden at dusk. Notice what has grown. Notice what needs the next cycle.',
  },
}

function getDaysUntilNextPhase(currentPhaseName: PhaseKey): number {
  const known = new Date('2000-01-06')
  const diff = (Date.now() - known.getTime()) / 86400000
  const cycle = diff % 29.53

  const phaseStarts: Record<PhaseKey, number> = {
    'New Moon': 0,
    'Waxing Crescent': 1.85,
    'First Quarter': 7.38,
    'Waxing Gibbous': 9.22,
    'Full Moon': 14.77,
    'Waning Gibbous': 16.61,
    'Last Quarter': 22.15,
    'Waning Crescent': 23.99,
  }

  const phases = Object.keys(phaseStarts) as PhaseKey[]
  const currentIdx = phases.indexOf(currentPhaseName)
  const nextPhase = phases[(currentIdx + 1) % phases.length]
  const nextStart = phaseStarts[nextPhase]

  let daysLeft = nextStart > cycle ? nextStart - cycle : 29.53 - cycle + nextStart
  return Math.ceil(daysLeft)
}

export default function PlantingCalendar() {
  const moon = getMoonPhase()
  const phaseName = moon.name as PhaseKey
  const data = PHASE_DATA[phaseName]
  const daysUntilNext = getDaysUntilNextPhase(phaseName)

  const allPhases = Object.keys(PHASE_DATA) as PhaseKey[]

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", color: '#e8e0ff' }}>

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(155,138,255,0.12) 0%, rgba(201,168,76,0.08) 100%)',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: '16px',
        padding: '28px 24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
          background: 'radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '6px' }}>
              Lunar Planting Calendar · Astra Premium
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '36px' }}>{moon.emoji}</span>
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 700, color: '#e8e0ff', margin: 0 }}>
                  {moon.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#C9A84C', marginTop: '2px' }}>
                  {data.energy}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(232,224,255,0.7)', lineHeight: 1.6, maxWidth: '500px', margin: 0 }}>
              {data.tagline}
            </p>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '12px',
            padding: '16px 20px',
            textAlign: 'center',
            minWidth: '120px',
          }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#C9A84C', fontFamily: "'Cormorant Garamond', serif" }}>
              {daysUntilNext}
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(232,224,255,0.5)', marginTop: '4px' }}>
              days until next phase
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>

        {/* Sow now */}
        <div style={{
          background: 'rgba(8,10,30,0.75)',
          border: '1px solid rgba(100,200,100,0.2)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🌱</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd87d' }}>Sow now</span>
          </div>
          {data.sow.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '8px 0',
              borderBottom: i < data.sow.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{ color: '#7dd87d', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: '12px', color: 'rgba(232,224,255,0.8)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div style={{
          background: 'rgba(8,10,30,0.75)',
          border: '1px solid rgba(155,138,255,0.2)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🌿</span>
            <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9b8aff' }}>Garden tasks</span>
          </div>
          {data.tasks.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '8px 0',
              borderBottom: i < data.tasks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <span style={{ color: '#9b8aff', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: '12px', color: 'rgba(232,224,255,0.8)', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Avoid + Zodiac + Ritual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: 'rgba(8,10,30,0.75)',
            border: '1px solid rgba(255,80,80,0.15)',
            borderRadius: '14px',
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff8080' }}>Avoid this phase</span>
            </div>
            {data.avoid.map((item, i) => (
              <div key={i} style={{
                fontSize: '12px', color: 'rgba(232,224,255,0.65)',
                padding: '4px 0',
                borderBottom: i < data.avoid.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                {item}
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(8,10,30,0.75)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '14px',
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '6px' }}>
              Best zodiac signs
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(232,224,255,0.75)', lineHeight: 1.5 }}>
              {data.zodiacBest}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(232,224,255,0.4)', marginTop: '4px' }}>
              Plan major planting on these moon sign days
            </div>
          </div>
        </div>
      </div>

      {/* Ritual card, gold premium */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(155,138,255,0.06) 100%)',
        border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: '14px',
        padding: '22px 24px',
        marginBottom: '32px',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '10px' }}>
          Garden ritual for this phase
        </div>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '17px',
          fontStyle: 'italic',
          color: 'rgba(232,224,255,0.9)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          &ldquo;{data.ritual}&rdquo;
        </p>
      </div>

      {/* All phases quick-reference strip */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(232,224,255,0.4)', marginBottom: '14px' }}>
          All lunar phases at a glance
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {allPhases.map((phase) => {
            const pd = PHASE_DATA[phase]
            const isActive = phase === phaseName
            return (
              <div key={phase} style={{
                background: isActive ? 'rgba(155,138,255,0.12)' : 'rgba(8,10,30,0.5)',
                border: isActive
                  ? '1px solid rgba(155,138,255,0.4)'
                  : pd.goldBorder
                  ? '1px solid rgba(201,168,76,0.25)'
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{pd.emoji}</div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#9b8aff' : 'rgba(232,224,255,0.55)',
                  lineHeight: 1.3,
                }}>
                  {phase}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(232,224,255,0.35)', marginTop: '3px' }}>
                  {pd.energy}
                </div>
                {isActive && (
                  <div style={{
                    fontSize: '9px',
                    color: '#9b8aff',
                    marginTop: '4px',
                    letterSpacing: '0.06em',
                  }}>
                    NOW
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: '20px',
        padding: '14px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '11px',
        color: 'rgba(232,224,255,0.3)',
        lineHeight: 1.6,
      }}>
        Moon phase calculated from lunar cycle data. Zodiac sign recommendations are based on traditional biodynamic gardening principles.
        Best results come from combining moon phase with local climate and soil conditions.
      </div>
    </div>
  )
}
