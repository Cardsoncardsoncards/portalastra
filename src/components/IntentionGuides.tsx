'use client'

// IntentionGuides.tsx, Premium component
// Full moon + new moon intention-setting guides
// Add to /app/moon/page.tsx or /app/calendars/page.tsx behind isPremium check
// Replace the "coming soon" placeholder on the pricing page with this

import { getMoonPhase } from '@/lib/shared'

type GuideType = 'full' | 'new'

interface GuideStep {
  time: string
  title: string
  instruction: string
}

interface MoonGuide {
  type: GuideType
  emoji: string
  heading: string
  subheading: string
  intention: string
  colour: string
  borderColour: string
  accentColour: string
  steps: GuideStep[]
  journalPrompts: string[]
  crystals: string[]
  herbs: string[]
  affirmation: string
}

const FULL_MOON_GUIDE: MoonGuide = {
  type: 'full',
  emoji: '🌕',
  heading: 'Full Moon Ritual',
  subheading: 'Release, celebrate, and receive',
  intention: 'The full moon illuminates what is ready to be seen and released. This is not a time to start, it is a time to complete, acknowledge, and let go of what no longer belongs to the next chapter of your life.',
  colour: 'rgba(201,168,76,0.06)',
  borderColour: 'rgba(201,168,76,0.3)',
  accentColour: '#C9A84C',
  steps: [
    {
      time: '3 days before',
      title: 'Write your release list',
      instruction: 'Identify what you are ready to release. Patterns, beliefs, relationships, habits, or emotions that have run their course. Write each one without judgment, simply witness what is ready to leave.',
    },
    {
      time: 'Day of full moon',
      title: 'Cleanse your space',
      instruction: 'Open windows, light candles, and clear physical clutter from one area of your home. This mirrors the energetic clearing you are doing internally. The full moon amplifies what is already present, make that presence intentional.',
    },
    {
      time: 'At moonrise',
      title: 'Perform the release ceremony',
      instruction: 'Read your release list aloud by candlelight. After each item, say: "I release this. I am grateful for what it taught me. I let it go." If safe to do so, burn the paper. Otherwise, tear it and place it in running water.',
    },
    {
      time: 'After release',
      title: 'State your gratitude',
      instruction: 'Speak aloud three things that came to fruition in the last lunar cycle. These do not need to be large, a conversation that shifted something, a moment of courage, a boundary held. Acknowledge what grew.',
    },
    {
      time: 'Before sleep',
      title: 'Set a receiving intention',
      instruction: 'Write one thing you are open to receiving in the next lunar cycle. Use present tense, as though it is already unfolding: "I am receiving [X]. I welcome it with clear eyes and an open heart."',
    },
  ],
  journalPrompts: [
    'What is asking to be released from my life right now?',
    'What have I been holding that is heavier than it needs to be?',
    'What came to completion in this cycle that deserves acknowledgment?',
    'What would feel lighter if I simply let it be what it is?',
    'What am I ready to receive once I create space for it?',
  ],
  crystals: ['Selenite (clarity and cleansing)', 'Moonstone (emotional balance)', 'Labradorite (release and transformation)', 'Clear quartz (amplification)'],
  herbs: ['White sage (cleansing)', 'Lavender (calm)', 'Mugwort (dreams and intuition)', 'Rosemary (memory and release)'],
  affirmation: 'I release what no longer serves me. I celebrate how far I have come. I open to what is ready to arrive.',
}

const NEW_MOON_GUIDE: MoonGuide = {
  type: 'new',
  emoji: '🌑',
  heading: 'New Moon Ritual',
  subheading: 'Seed, set intentions, and begin',
  intention: 'The new moon is the darkest point of the lunar cycle, and the most potent moment to plant seeds. In darkness, roots form before anything is visible. Your intentions set tonight will have the full cycle to grow, build energy, and bloom by the next full moon.',
  colour: 'rgba(155,138,255,0.06)',
  borderColour: 'rgba(155,138,255,0.25)',
  accentColour: '#9b8aff',
  steps: [
    {
      time: 'Evening of new moon',
      title: 'Create a clean slate',
      instruction: 'Before you begin, clean the surface where you will work. Turn off notifications. Light a single candle. This is a threshold moment, you are stepping from the old cycle into a new one. Honour it with physical stillness.',
    },
    {
      time: 'First 10 minutes',
      title: 'Breathe and arrive',
      instruction: 'Sit with your journal closed. Take ten slow breaths, counting each one. On the exhale, release the residue of the last cycle. On the inhale, draw in the blank-slate energy of the new moon. You are not setting goals yet, you are emptying.',
    },
    {
      time: 'Intention writing',
      title: 'Write your new moon intentions',
      instruction: 'Write 3 to 10 intentions for this lunar cycle. Keep them specific enough to feel real, open enough to allow surprise. Use present tense: "I am building...", "I am calling in...", "I am becoming..." Write by hand if possible, the act of writing anchors intention into the physical.',
    },
    {
      time: 'After writing',
      title: 'Read them aloud',
      instruction: 'Read each intention aloud to yourself. Your voice carries frequency. Speaking what you have written moves it from inner to outer, from thought into the room around you, and therefore into the world.',
    },
    {
      time: 'Close the ritual',
      title: 'Seal your intentions',
      instruction: 'Place both hands over your journal. Close your eyes. Say: "These seeds are planted. I trust the cycle to do its work. I will tend what is mine to tend, and release what is not." Blow out the candle.',
    },
  ],
  journalPrompts: [
    'What do I want to call into my life in the next 28 days?',
    'What quality do I want to embody this cycle?',
    'What am I willing to begin, even imperfectly?',
    'What would feel like a true arrival by the time the full moon comes?',
    'Who do I want to be by the end of this lunar cycle?',
  ],
  crystals: ['Black tourmaline (grounding new beginnings)', 'Citrine (manifestation and clarity)', 'Amethyst (intuition and alignment)', 'Green aventurine (new growth)'],
  herbs: ['Bay leaves (write intentions and burn)', 'Cinnamon (acceleration)', 'Peppermint (clarity and fresh starts)', 'Cedar (grounding)'],
  affirmation: 'I plant my intentions in fertile ground. The cycle works with me. I trust what is growing in the dark.',
}

function GuideCard({ guide }: { guide: MoonGuide }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${guide.colour} 0%, rgba(8,10,30,0.8) 100%)`,
      border: `1px solid ${guide.borderColour}`,
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '32px',
    }}>
      {/* Guide header */}
      <div style={{
        padding: '28px 28px 20px',
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <span style={{ fontSize: '40px' }}>{guide.emoji}</span>
          <div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '26px',
              fontWeight: 700,
              color: '#e8e0ff',
              margin: 0,
            }}>
              {guide.heading}
            </h3>
            <div style={{ fontSize: '12px', color: guide.accentColour, marginTop: '3px', letterSpacing: '0.06em' }}>
              {guide.subheading}
            </div>
          </div>
        </div>
        <p style={{
          fontSize: '13px',
          color: 'rgba(232,224,255,0.7)',
          lineHeight: 1.7,
          margin: 0,
          maxWidth: '640px',
        }}>
          {guide.intention}
        </p>
      </div>

      {/* Steps */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: guide.accentColour, marginBottom: '16px' }}>
          The ritual, step by step
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {guide.steps.map((step, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: '16px',
              paddingBottom: i < guide.steps.length - 1 ? '20px' : '0',
              marginBottom: i < guide.steps.length - 1 ? '20px' : '0',
              borderBottom: i < guide.steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div>
                <div style={{
                  fontSize: '10px',
                  color: guide.accentColour,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1.4,
                }}>
                  {step.time}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e0ff', marginBottom: '6px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(232,224,255,0.7)', lineHeight: 1.7 }}>
                  {step.instruction}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Journal prompts */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: guide.accentColour, marginBottom: '12px' }}>
          Journal prompts for this moon
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
          {guide.journalPrompts.map((prompt, i) => (
            <div key={i} style={{
              background: 'rgba(8,10,30,0.6)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '12px',
              color: 'rgba(232,224,255,0.75)',
              lineHeight: 1.5,
            }}>
              <span style={{ color: guide.accentColour, marginRight: '6px' }}>✦</span>
              {prompt}
            </div>
          ))}
        </div>
      </div>

      {/* Crystals + Herbs row */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
      }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: guide.accentColour, marginBottom: '10px' }}>
            Supporting crystals
          </div>
          {guide.crystals.map((crystal, i) => (
            <div key={i} style={{
              fontSize: '12px',
              color: 'rgba(232,224,255,0.7)',
              padding: '5px 0',
              borderBottom: i < guide.crystals.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              {crystal}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: guide.accentColour, marginBottom: '10px' }}>
            Herbs and botanicals
          </div>
          {guide.herbs.map((herb, i) => (
            <div key={i} style={{
              fontSize: '12px',
              color: 'rgba(232,224,255,0.7)',
              padding: '5px 0',
              borderBottom: i < guide.herbs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              {herb}
            </div>
          ))}
        </div>
      </div>

      {/* Affirmation */}
      <div style={{
        padding: '20px 28px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: `linear-gradient(135deg, ${guide.colour} 0%, transparent 100%)`,
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: guide.accentColour, marginBottom: '10px' }}>
          Affirmation
        </div>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '18px',
          fontStyle: 'italic',
          color: 'rgba(232,224,255,0.9)',
          lineHeight: 1.7,
          margin: 0,
        }}>
          &ldquo;{guide.affirmation}&rdquo;
        </p>
      </div>
    </div>
  )
}

export default function IntentionGuides() {
  const moon = getMoonPhase()
  const isNearFullMoon = moon.name === 'Full Moon' || moon.name === 'Waxing Gibbous'
  const isNearNewMoon = moon.name === 'New Moon' || moon.name === 'Waning Crescent'

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", color: '#e8e0ff' }}>

      {/* Active moon callout */}
      {(isNearFullMoon || isNearNewMoon) && (
        <div style={{
          background: 'rgba(155,138,255,0.08)',
          border: '1px solid rgba(155,138,255,0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          fontSize: '12px',
          color: 'rgba(232,224,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>{moon.emoji}</span>
          <span>
            {isNearFullMoon
              ? `You are in the ${moon.name} phase, the full moon ritual is most potent right now.`
              : `You are in the ${moon.name} phase, the new moon ritual is most potent right now.`}
          </span>
        </div>
      )}

      <GuideCard guide={FULL_MOON_GUIDE} />
      <GuideCard guide={NEW_MOON_GUIDE} />

      {/* Disclaimer */}
      <div style={{
        padding: '14px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '11px',
        color: 'rgba(232,224,255,0.3)',
        lineHeight: 1.6,
      }}>
        These guides draw from lunar cycle traditions and ritual practice. They are offered as tools for reflection and intention, not as spiritual prescription.
        Use what resonates. Leave what does not.
      </div>
    </div>
  )
}
