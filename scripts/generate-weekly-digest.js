// scripts/generate-weekly-digest.js
// Runs every Sunday via GitHub Actions
// Fetches NASA data → Claude generates email → MailerLite campaign created and scheduled

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const NASA_KEY       = process.env.NASA_API_KEY
const MAILERLITE_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY
const GROUP_ID       = '189583616610666425'  // Portal Astra - Free

// ─── Tarot deck (self-contained copy of src/lib/tarot.ts TAROT_DECK) ────────
// No imports — replicates the same 22 majors + 56 minors (78 total).
const TAROT_CARDS = (() => {
  const MAJORS = [
    { name: 'The Fool',           emoji: '🃏', arcana: 'Major', theme: 'New beginnings',  upright: 'A leap of faith, fresh starts, and innocent trust in the road ahead.', reversed: 'Recklessness, hesitation, or fear of stepping into the unknown.' },
    { name: 'The Magician',       emoji: '🪄', arcana: 'Major', theme: 'Manifestation',   upright: 'You hold every tool you need — focus your will and create.',           reversed: 'Scattered energy, untapped talent, or manipulation at play.' },
    { name: 'The High Priestess', emoji: '🌙', arcana: 'Major', theme: 'Intuition',       upright: 'Inner knowing speaks softly; trust the mystery you already sense.',     reversed: 'Secrets withheld, silenced intuition, surface over depth.' },
    { name: 'The Empress',        emoji: '👑', arcana: 'Major', theme: 'Abundance',       upright: 'Nurturing, fertility, and creative abundance flow toward you.',         reversed: 'Creative block, neglect, or smothering of what you tend.' },
    { name: 'The Emperor',        emoji: '🏛️', arcana: 'Major', theme: 'Structure',       upright: 'Authority, stability, and the discipline to build something lasting.',  reversed: 'Rigidity, control, or a structure that no longer serves.' },
    { name: 'The Hierophant',     emoji: '📜', arcana: 'Major', theme: 'Tradition',       upright: 'Guidance, shared belief, and wisdom passed down through ritual.',       reversed: 'Rebellion against dogma, or freedom from inherited rules.' },
    { name: 'The Lovers',         emoji: '💞', arcana: 'Major', theme: 'Union',           upright: 'Connection, alignment of values, and a meaningful choice of the heart.',reversed: 'Discord, misalignment, or a difficult choice avoided.' },
    { name: 'The Chariot',        emoji: '🛞', arcana: 'Major', theme: 'Willpower',       upright: 'Drive and determination carry you to victory — steer with focus.',     reversed: 'Loss of direction, opposing forces, or stalled momentum.' },
    { name: 'Strength',           emoji: '🦁', arcana: 'Major', theme: 'Courage',         upright: 'Gentle power, patience, and courage that tames the wildest fear.',      reversed: 'Self-doubt, raw emotion, or strength turned to force.' },
    { name: 'The Hermit',         emoji: '🕯️', arcana: 'Major', theme: 'Reflection',      upright: 'Solitude lights the way; seek the answer that lives within.',           reversed: 'Isolation, withdrawal, or refusing the wisdom of stillness.' },
    { name: 'Wheel of Fortune',   emoji: '🎡', arcana: 'Major', theme: 'Cycles',          upright: 'Fate turns in your favour — change, luck, and a new chapter open.',     reversed: 'Resistance to change, bad timing, or cycles repeating.' },
    { name: 'Justice',            emoji: '⚖️', arcana: 'Major', theme: 'Truth',           upright: 'Fairness, accountability, and cause meeting its honest effect.',        reversed: 'Imbalance, dishonesty, or consequences avoided.' },
    { name: 'The Hanged Man',     emoji: '🙃', arcana: 'Major', theme: 'Surrender',       upright: 'A pause and a new perspective; release the need to control.',           reversed: 'Stalling, martyrdom, or clinging when it is time to let go.' },
    { name: 'Death',              emoji: '💀', arcana: 'Major', theme: 'Transformation',  upright: 'An ending clears the ground for profound renewal.',                    reversed: 'Resistance to an ending, or change held at bay.' },
    { name: 'Temperance',         emoji: '🍷', arcana: 'Major', theme: 'Balance',         upright: 'Patience and moderation blend opposites into harmony.',                reversed: 'Excess, impatience, or elements out of proportion.' },
    { name: 'The Devil',          emoji: '😈', arcana: 'Major', theme: 'Attachment',      upright: 'Face what binds you — desire, habit, or fear holding you in place.',    reversed: 'Release from chains, reclaiming your own power.' },
    { name: 'The Tower',          emoji: '🗼', arcana: 'Major', theme: 'Upheaval',        upright: 'Sudden change shakes a false foundation so truth can stand.',           reversed: 'Averted disaster, or clinging to a crumbling structure.' },
    { name: 'The Star',           emoji: '⭐', arcana: 'Major', theme: 'Hope',            upright: 'Healing, renewal, and quiet faith after the storm.',                   reversed: 'Doubt, dimmed hope, or disconnection from your light.' },
    { name: 'The Moon',           emoji: '🌕', arcana: 'Major', theme: 'Mystery',         upright: 'Dreams, illusion, and intuition guiding you through the unknown.',      reversed: 'Confusion lifting, or fears finally brought to light.' },
    { name: 'The Sun',            emoji: '☀️', arcana: 'Major', theme: 'Joy',             upright: 'Warmth, success, and radiant clarity — a wholehearted yes.',           reversed: 'Temporary clouds, dimmed optimism, or delayed joy.' },
    { name: 'Judgement',          emoji: '🎺', arcana: 'Major', theme: 'Awakening',       upright: 'A calling, reckoning, and rebirth into a truer self.',                 reversed: 'Self-doubt, avoidance, or a call left unanswered.' },
    { name: 'The World',          emoji: '🌍', arcana: 'Major', theme: 'Completion',      upright: 'Fulfilment, wholeness, and the joyful close of a great cycle.',        reversed: 'Loose ends, a goal nearly reached, or closure delayed.' },
  ]
  const SUITS = [
    { suit: 'Wands',     emoji: '🔥', theme: 'energy, passion and ambition' },
    { suit: 'Cups',      emoji: '💧', theme: 'emotion, intuition and relationships' },
    { suit: 'Swords',    emoji: '⚔️', theme: 'intellect, truth and conflict' },
    { suit: 'Pentacles', emoji: '🪙', theme: 'work, money and the material world' },
  ]
  const RANKS = [
    { name: 'Ace',    theme: 'New spark',    up: 'a pure new spark of',                 rev: 'a blocked or delayed beginning in' },
    { name: 'Two',    theme: 'Choice',       up: 'balance and a meaningful choice in',  rev: 'indecision and imbalance in' },
    { name: 'Three',  theme: 'Growth',       up: 'early growth and collaboration in',   rev: 'stalled progress or misalignment in' },
    { name: 'Four',   theme: 'Stability',    up: 'rest, structure and stability in',    rev: 'stagnation or clinging within' },
    { name: 'Five',   theme: 'Challenge',    up: 'conflict, loss or challenge in',      rev: 'recovery and release from struggle in' },
    { name: 'Six',    theme: 'Harmony',      up: 'harmony, generosity and progress in', rev: 'imbalance or stalled momentum in' },
    { name: 'Seven',  theme: 'Perseverance', up: 'perseverance and assessment in',      rev: 'doubt or giving up too soon in' },
    { name: 'Eight',  theme: 'Movement',     up: 'swift movement and mastery in',       rev: 'delay, scattered focus or haste in' },
    { name: 'Nine',   theme: 'Resilience',   up: 'resilience and near-fulfilment in',   rev: 'anxiety or guardedness around' },
    { name: 'Ten',    theme: 'Completion',   up: 'completion and lasting legacy in',    rev: 'burden or an overdue ending in' },
    { name: 'Page',   theme: 'Curiosity',    up: 'curiosity and a fresh message about', rev: 'immaturity or blocked news about' },
    { name: 'Knight', theme: 'Action',       up: 'bold action and pursuit of',          rev: 'recklessness or stalled drive in' },
    { name: 'Queen',  theme: 'Mastery',      up: 'nurturing mastery and depth in',      rev: 'insecurity or imbalance in' },
    { name: 'King',   theme: 'Command',      up: 'authority and confident command of',  rev: 'control, coldness or misuse of' },
  ]
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  const minors = []
  for (const s of SUITS) {
    for (const r of RANKS) {
      minors.push({
        name: `${r.name} of ${s.suit}`,
        emoji: s.emoji,
        arcana: s.suit,
        theme: r.theme,
        upright: `${cap(r.up)} ${s.theme}.`,
        reversed: `${cap(r.rev)} ${s.theme}.`,
      })
    }
  }
  return [...MAJORS, ...minors]
})()

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMoonPhase() {
  const known = new Date('2000-01-06')
  const diff  = (Date.now() - known.getTime()) / 86400000
  const cycle = diff % 29.53
  if (cycle < 1.85)  return { name: 'New Moon',        emoji: '🌑', illumination: 0   }
  if (cycle < 7.38)  return { name: 'Waxing Crescent', emoji: '🌒', illumination: 25  }
  if (cycle < 9.22)  return { name: 'First Quarter',   emoji: '🌓', illumination: 50  }
  if (cycle < 14.77) return { name: 'Waxing Gibbous',  emoji: '🌔', illumination: 75  }
  if (cycle < 16.61) return { name: 'Full Moon',       emoji: '🌕', illumination: 100 }
  if (cycle < 22.15) return { name: 'Waning Gibbous',  emoji: '🌖', illumination: 75  }
  if (cycle < 23.99) return { name: 'Last Quarter',    emoji: '🌗', illumination: 50  }
  return               { name: 'Waning Crescent',      emoji: '🌘', illumination: 25  }
}

function formatDateAEST() {
  return new Date().toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

// Next Sunday at 09:00 UTC (= 7pm AEST) for MailerLite schedule
function getScheduleTime() {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon ... 6=Sat
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  const next = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilSunday)
  next.setUTCHours(9, 0, 0, 0)
  return next.toISOString()
}

const EVENT_TYPE_NAMES = {
  CME: 'Coronal Mass Ejection', FLR: 'Solar Flare',
  GST: 'Geomagnetic Storm',     IPS: 'Interplanetary Shockwave',
  MPC: 'Magnetopause Crossing', RBE: 'Radiation Belt Enhancement',
  HSS: 'High-Speed Solar Wind', SEP: 'Solar Energetic Particles',
  WSA: 'Solar Wind Event',
}

const INTENSITY_LABELS = {
  low:      'mild — no significant impact on daily life',
  moderate: 'moderate — minor satellite and radio effects possible',
  high:     'strong — auroras may be visible at higher latitudes',
  extreme:  'severe — potential disruptions to GPS and power grids',
}

// ─── Data fetching ───────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Retry up to 3 times with 500ms delays. NASA's APOD endpoint returns transient
// 5xx errors with non-JSON bodies fairly often, so we retry on a 5xx status or
// an invalid-JSON response (same idea as the retry in src/lib/nasa.ts).
async function fetchAPOD() {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url)
      if (r.status >= 500) throw new Error(`APOD responded ${r.status}`)
      const d = await r.json() // throws if the body isn't valid JSON
      return {
        title:       d.title || 'Unknown',
        explanation: d.explanation || '',
        date:        d.date || '',
        url:         d.url || '',
        hdurl:       d.hdurl || '',
      }
    } catch (e) {
      console.error(`APOD fetch attempt ${attempt + 1} failed:`, e.message)
      if (attempt < 2) await sleep(500)
    }
  }
  console.error('APOD fetch failed after 3 attempts')
  return { title: 'Unavailable', explanation: '', date: '', url: '', hdurl: '' }
}

async function fetchDONKI() {
  try {
    const end   = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const types = ['CME', 'FLR', 'GST']
    const all   = []

    for (const type of types) {
      const r = await fetch(
        `https://api.nasa.gov/DONKI/${type}?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`
      )
      const data = await r.json()
      if (Array.isArray(data)) {
        data.forEach(ev => {
          all.push({
            type,
            typeName: EVENT_TYPE_NAMES[type] || type,
            time: ev.startTime || ev.beginTime || '',
            intensity: ev.classType || ev.kpIndex || 'low',
          })
        })
      }
    }

    if (all.length === 0) return { summary: 'The sun has been quiet this week. Calm, grounding cosmic energy surrounds us.', count: 0 }

    const top = all[0]
    const label = INTENSITY_LABELS[top.intensity] || top.intensity
    return {
      summary: `${top.typeName} activity was detected this week — ${label}.`,
      count: all.length,
      topType: top.typeName,
    }
  } catch (e) {
    console.error('DONKI fetch failed:', e.message)
    return { summary: 'Solar activity data temporarily unavailable.', count: 0 }
  }
}

// ─── Claude generation ───────────────────────────────────────────────────────

async function generateEmail({ moon, apod, solar, dateStr, weeklyCard, angelNumber }) {
  const tarotKeywords = `${weeklyCard.theme} — ${weeklyCard.upright}`
  const prompt = `You are writing the weekly cosmic digest email for Portal Astra (portalastra.com).

Brand tone: mystical but grounded, scientific but accessible. Warm, poetic, never cheesy.
Audience: people who love both space science and spirituality — astrology enthusiasts, spiritual seekers, science lovers.

This week's data:
- Date: ${dateStr}
- Moon phase: ${moon.name} ${moon.emoji} (${moon.illumination}% illuminated)
- NASA Picture of the Day: "${apod.title}" — ${apod.explanation.slice(0, 300)}...
- Solar activity: ${solar.summary}

Write a weekly email digest with these exact sections:

SUBJECT: [one compelling subject line, max 60 chars, no clickbait]

PREVIEW: [one sentence preview text, max 90 chars]

GREETING: [one warm opening sentence referencing the moon phase or date]

MOON: [2-3 sentences about this week's moon phase — what it means energetically, what to focus on]

SPACE: [2-3 sentences about the NASA image — accessible description, why it's wondrous, a brief spiritual or reflective angle]

SOLAR: [1-2 sentences about solar activity and its energetic significance]

RITUAL: [one practical moon ritual tip suited to this phase — concrete and doable]

SIGN_OFF: [one closing sentence — warm, cosmic, encouraging]

Format exactly as shown. Each section on its own line starting with the label in caps followed by a colon.

WRITING RULES — follow strictly:
- No em dashes or en dashes. Use a full stop or restructure the sentence instead.
- No paradox framing ("X and Y are not opposites but...")
- Never use "eternal", "forever", "infinite", "tapestry", "dance" as metaphors
- Sentences under 25 words where possible
- The CTA button text must be specific to this week — use the NASA image title or moon phase name, not "Open Portal Astra"
- End the SIGN_OFF with something quotable and specific to this week's moon phase, not a generic blessing

ADDITIONAL INSTRUCTIONS (override earlier guidance where they conflict):

SUBJECT LINE: Reference the current moon phase and one specific content hook. Format: '[Moon phase]: [hook]'. Example: 'Waning Crescent: release what no longer fits'. Under 50 characters. No generic phrases.

PREHEADER: 60-80 character inbox preview teaser. Specific to this week. Return as field "preheader" on its own line: PREHEADER: [text]

TAROT: Card this week: ${weeklyCard.name}, keywords: ${tarotKeywords}. Write one sentence on this card's energy for the week (under 20 words) and one sentence on the action it calls for (under 20 words). No em dashes. Return as field "tarot" with subfields cardName, keywords, reading — the cardName and keywords are already known, so only return the reading on its own line: TAROT_READING: [two sentences]

ANGEL NUMBER: This week is ${angelNumber}. One-line meaning tied to the week, 10 words. Return as field "angelNumber" with subfields number, meaning — the number is already known, so only return the meaning on its own line: ANGEL_NUMBER_MEANING: [one line]

SOLAR: End the SOLAR section with one sentence starting 'This week:' tying space weather to a human grounding tip. Under 20 words.

CTA: Write a 4-6 word CTA referencing the moon phase. Example: 'Explore the Waning Crescent'. Return as field "ctaText" on its own line: CTA_TEXT: [4-6 words]

ADDITIONAL FIELDS — include these labeled lines in your response in addition to the original sections:
PREHEADER: ...
TAROT_READING: ...
ANGEL_NUMBER_MEANING: ...
CTA_TEXT: ...`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-5',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    const d = await r.json()
    if (!r.ok) {
      console.error('Claude API error:', r.status, JSON.stringify(d).slice(0, 300))
      return null
    }
    const text = d.content?.[0]?.text?.trim()
    if (!text) {
      console.error('Claude returned an empty response:', JSON.stringify(d).slice(0, 300))
      return null
    }
    return text
  } catch (e) {
    console.error('Claude generation failed:', e.message)
    return null
  }
}

// ─── Parse Claude output ─────────────────────────────────────────────────────

function parseEmail(raw) {
  const get = (label) => {
    const match = raw.match(new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's'))
    return match ? match[1].trim() : ''
  }
  return {
    subject:       get('SUBJECT'),
    preview:       get('PREVIEW'),
    greeting:      get('GREETING'),
    moon:          get('MOON'),
    space:         get('SPACE'),
    solar:         get('SOLAR'),
    ritual:        get('RITUAL'),
    signOff:       get('SIGN_OFF'),
    preheader:     get('PREHEADER'),
    tarotReading:  get('TAROT_READING'),
    angelMeaning:  get('ANGEL_NUMBER_MEANING'),
    ctaText:       get('CTA_TEXT'),
  }
}

// ─── Build HTML email ────────────────────────────────────────────────────────

function buildEmailHTML(p, moon, apod, tarot, angel) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Mono',monospace,sans-serif;color:#e8e0ff;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${p.preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
        <img src="https://www.portalastra.com/images/portalastralogohorizontal.png"
          alt="Portal Astra" width="220" style="display:block;margin:0 auto 12px;" />
        <p style="margin:0;font-size:11px;color:rgba(232,224,255,0.35);letter-spacing:0.14em;text-transform:uppercase;">
          Weekly Cosmic Digest
        </p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:32px 0 8px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(232,224,255,0.85);">${p.greeting}</p>
      </td></tr>

      <!-- Moon -->
      <tr><td style="padding:24px 0;">
        <div style="background:rgba(155,138,255,0.06);border:1px solid rgba(155,138,255,0.15);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            ${moon.emoji} Moon Phase · ${moon.name}
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${p.moon}</p>
        </div>
      </td></tr>

      <!-- Tarot -->
      <tr><td style="padding:0 0 24px 0;"><a href="https://portalastra.com/?tab=tarot" style="text-decoration:none;display:block;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 20px;background:rgba(8,10,30,0.75);border:1px solid rgba(155,138,255,0.2);border-radius:10px;"><p style="margin:0 0 4px 0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">This week's tarot</p><p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#e8e0ff;">${tarot.cardName}</p><p style="margin:0 0 10px 0;font-size:12px;color:rgba(232,224,255,0.55);">${tarot.keywords}</p><p style="margin:0 0 10px 0;font-size:14px;color:rgba(232,224,255,0.85);line-height:1.7;">${tarot.reading}</p><p style="margin:0;font-size:12px;color:#9b8aff;">Draw your full reading →</p></td></tr></table></a></td></tr>

      <!-- Angel number -->
      <tr><td style="padding:0 0 24px 0;"><a href="https://portalastra.com/?tab=sky" style="text-decoration:none;display:block;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 16px;background:rgba(8,10,30,0.75);border:1px solid rgba(201,168,76,0.2);border-radius:10px;"><p style="margin:0 0 4px 0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">This week's angel number</p><p style="margin:0;font-size:14px;color:rgba(232,224,255,0.85);">${angel.number} — ${angel.meaning}</p></td></tr></table></a></td></tr>

      <!-- Space -->
      <tr><td style="padding:0 0 24px;">
        <div style="background:rgba(8,10,30,0.75);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            🌌 NASA · ${apod.title}
          </p>
          <img src="${apod.hdurl || apod.url}" alt="${apod.title}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:block;" />
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${p.space}</p>
        </div>
      </td></tr>

      <!-- Solar -->
      <tr><td style="padding:0 0 24px;">
        <div style="background:rgba(8,10,30,0.75);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            ☀️ Solar Activity
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${p.solar}</p>
        </div>
      </td></tr>

      <!-- Ritual -->
      <tr><td style="padding:0 0 32px;">
        <div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">
            ✨ This Week's Ritual
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${p.ritual}</p>
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 0 32px;text-align:center;">
        <a href="https://www.portalastra.com"
          style="display:inline-block;background:rgba(155,138,255,0.2);border:1px solid rgba(155,138,255,0.35);
          border-radius:10px;padding:14px 32px;color:#c4b8ff;font-size:12px;letter-spacing:0.1em;
          text-decoration:none;text-transform:uppercase;">
          ${p.ctaText} →
        </a>
      </td></tr>

      <!-- Sign off -->
      <tr><td style="padding:0 0 32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:24px;">
        <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.6);font-style:italic;">${p.signOff}</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(232,224,255,0.3);">— The Portal Astra team</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="text-align:center;">
        <p style="margin:0 0 4px;font-size:10px;color:rgba(232,224,255,0.2);letter-spacing:0.06em;">
          You're receiving this because you subscribed at portalastra.com
        </p>
        <p style="font-size:11px;color:rgba(232,224,255,0.3);margin:0 0 6px 0;text-align:center;">You are receiving this as a Portal Astra subscriber at {$email}.</p>
        <p style="margin:0;font-size:10px;color:rgba(232,224,255,0.2);letter-spacing:0.06em;">
          <a href="{$unsubscribe}" style="color:rgba(155,138,255,0.4);">Unsubscribe</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── MailerLite ──────────────────────────────────────────────────────────────

async function createAndScheduleCampaign(subject, htmlContent, scheduledAt) {
  // Step 1 — Create campaign (draft)
  const createRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({
      name: `Weekly Digest — ${new Date().toISOString().split('T')[0]}`,
      type: 'regular',
      emails: [{
        subject,
        from_name: 'Portal Astra',
        from:      'theportalastra@gmail.com',
        content:   htmlContent,
        type:      'html',
      }],
      groups: [GROUP_ID],
    }),
  })

  const campaign = await createRes.json()
  if (!campaign.data?.id) {
    console.error('Campaign creation failed:', JSON.stringify(campaign))
    throw new Error('Failed to create MailerLite campaign')
  }

  const campaignId = campaign.data.id
  console.log(`Campaign created: ${campaignId}`)

  // Step 2 — Schedule campaign. Scheduling transitions the campaign from
  // draft to ready/sent automatically, so no separate status update is needed.
  // MailerLite requires schedule.date, schedule.hours and schedule.minutes as
  // separate fields (not a single ISO datetime string).
  const scheduleDate = new Date(scheduledAt)
  const scheduleRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({
      delivery: 'scheduled',
      schedule: {
        date:    scheduleDate.toISOString().split('T')[0],
        hours:   String(scheduleDate.getUTCHours()).padStart(2, '0'),
        minutes: String(scheduleDate.getUTCMinutes()).padStart(2, '0'),
      },
    }),
  })

  const scheduled = await scheduleRes.json()
  if (scheduled.data?.status === 'scheduled') {
    console.log(`Campaign scheduled for ${scheduledAt}`)
  } else {
    console.warn('Schedule response:', JSON.stringify(scheduled))
  }

  return campaignId
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Portal Astra weekly digest starting...')

  const moon    = getMoonPhase()
  const dateStr = formatDateAEST()

  console.log(`Moon: ${moon.name} | Date: ${dateStr}`)

  const [apod, solar] = await Promise.all([fetchAPOD(), fetchDONKI()])
  console.log(`APOD: ${apod.title} | Solar events: ${solar.count}`)

  const startOfYear = new Date(new Date().getFullYear(), 0, 0)
  const weekNumber = Math.floor((Date.now() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const weeklyCard = TAROT_CARDS[weekNumber % TAROT_CARDS.length]
  const _an = new Date()
  const _digits = [_an.getDate(), _an.getMonth() + 1, ..._an.getFullYear().toString().split('').map(Number)]
  let angelNumber = _digits.reduce((a, b) => a + b, 0)
  while (angelNumber > 9) { angelNumber = angelNumber.toString().split('').map(Number).reduce((a,b)=>a+b,0) }
  console.log(`Week #${weekNumber} | Tarot: ${weeklyCard.name} | Angel: ${angelNumber}`)

  const rawEmail = await generateEmail({ moon, apod, solar, dateStr, weeklyCard, angelNumber })
  if (!rawEmail) throw new Error('Claude generation returned nothing')

  const parsed = parseEmail(rawEmail)
  if (!parsed.subject) throw new Error('Could not parse subject line from Claude output')

  console.log(`Subject: ${parsed.subject}`)

  const tarot = {
    cardName: weeklyCard.name,
    keywords: `${weeklyCard.theme} — ${weeklyCard.upright}`,
    reading:  parsed.tarotReading,
  }
  const angel = { number: angelNumber, meaning: parsed.angelMeaning }

  const html        = buildEmailHTML(parsed, moon, apod, tarot, angel)
  const scheduleAt  = getScheduleTime()
  const campaignId  = await createAndScheduleCampaign(parsed.subject, html, scheduleAt)

  console.log(`Done. Campaign ${campaignId} scheduled for ${scheduleAt}`)
}

main().catch(err => {
  console.error('Weekly digest failed:', err.message)
  process.exit(1)
})
