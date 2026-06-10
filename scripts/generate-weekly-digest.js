// scripts/generate-weekly-digest.js
// Runs every Sunday via GitHub Actions
// Fetches NASA data → Claude generates email → MailerLite campaign created and scheduled

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const NASA_KEY       = process.env.NASA_API_KEY
const MAILERLITE_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY
const GROUP_ID       = '189583616610666425'  // Portal Astra - Free

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

async function generateEmail({ moon, apod, solar, dateStr }) {
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
- End the SIGN_OFF with something quotable and specific to this week's moon phase, not a generic blessing`

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
    subject:  get('SUBJECT'),
    preview:  get('PREVIEW'),
    greeting: get('GREETING'),
    moon:     get('MOON'),
    space:    get('SPACE'),
    solar:    get('SOLAR'),
    ritual:   get('RITUAL'),
    signOff:  get('SIGN_OFF'),
  }
}

// ─── Build HTML email ────────────────────────────────────────────────────────

function buildEmailHTML(p, moon, apod) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Mono',monospace,sans-serif;color:#e8e0ff;">
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
          Open Portal Astra →
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

  // Step 2 — Mark campaign as ready before scheduling
  const readyRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({ status: 'ready' }),
  })
  if (!readyRes.ok) {
    console.warn('Status-ready PATCH returned', readyRes.status, await readyRes.text())
  }
  await sleep(1000)

  // Step 3 — Schedule campaign
  const scheduleRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({ delivery: 'scheduled', schedule: { date: scheduledAt } }),
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

  const rawEmail = await generateEmail({ moon, apod, solar, dateStr })
  if (!rawEmail) throw new Error('Claude generation returned nothing')

  const parsed = parseEmail(rawEmail)
  if (!parsed.subject) throw new Error('Could not parse subject line from Claude output')

  console.log(`Subject: ${parsed.subject}`)

  const html        = buildEmailHTML(parsed, moon, apod)
  const scheduleAt  = getScheduleTime()
  const campaignId  = await createAndScheduleCampaign(parsed.subject, html, scheduleAt)

  console.log(`Done. Campaign ${campaignId} scheduled for ${scheduleAt}`)
}

main().catch(err => {
  console.error('Weekly digest failed:', err.message)
  process.exit(1)
})
