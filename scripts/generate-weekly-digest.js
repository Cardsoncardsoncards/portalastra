// scripts/generate-weekly-digest.js
// Runs every Sunday via GitHub Actions
// Fetches NASA data → Claude generates email → MailerLite campaign created and scheduled

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

// One shared implementation of the moon phase, angel number, tarot deck and
// draw, DONKI classifiers and group IDs. This is the same code the site runs,
// so the email and the site cannot drift apart.
const {
  getTodayAEST,
  formatDateLongAEST,
  getMoonPhase,
  getAngelNumber,
  getWeeklySpread,
  cardKeywords,
  classifyEvent,
  EVENT_TYPE_NAMES,
  INTENSITY_LABELS,
  FREE_GROUP_ID,
  esc,
  escUrl,
  emailFooterHTML,
  validateFields,
  STYLE_RULES_PROMPT,
} = require('../src/lib/shared')

const NASA_KEY       = process.env.NASA_API_KEY
const MAILERLITE_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY

// ─── Helpers ────────────────────────────────────────────────────────────────

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
          // Classify with the same functions /api/donki uses. The old code put
          // NASA's raw class string ("M1.5") straight into `intensity`, so the
          // label lookup below never matched and the email printed "M1.5"
          // where it meant to print "strong".
          const { intensity } = classifyEvent(type, ev)
          all.push({
            type,
            typeName: EVENT_TYPE_NAMES[type] || type,
            time: ev.startTime || ev.beginTime || '',
            intensity,
          })
        })
      }
    }

    if (all.length === 0) return { summary: 'The sun has been quiet this week. Calm, grounding cosmic energy surrounds us.', count: 0 }

    // Report the strongest event of the week, not whichever came back first.
    const ORDER = { low: 0, moderate: 1, high: 2, extreme: 3 }
    const top = all.reduce((a, b) => (ORDER[b.intensity] > ORDER[a.intensity] ? b : a))
    const label = INTENSITY_LABELS[top.intensity] || top.intensity
    return {
      summary: `${top.typeName} activity was detected this week. It was ${label}.`,
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
  const tarotKeywords = cardKeywords(weeklyCard)
  const prompt = `You are writing the weekly cosmic digest email for Portal Astra (portalastra.com).

Brand tone: mystical but grounded, scientific but accessible. Warm, poetic, never cheesy.
Audience: people who love both space science and spirituality, astrology enthusiasts, spiritual seekers, science lovers.

This week's data:
- Date: ${dateStr}
- Moon phase: ${moon.name} ${moon.emoji} (${moon.illumination}% illuminated)
- NASA Picture of the Day: "${apod.title}", ${apod.explanation.slice(0, 300)}...
- Solar activity: ${solar.summary}

Write a weekly email digest with these exact sections:

SUBJECT: [one compelling subject line, max 60 chars, no clickbait]

PREVIEW: [one sentence preview text, max 90 chars]

GREETING: [one warm opening sentence referencing the moon phase or date]

MOON: [2-3 sentences about this week's moon phase, what it means energetically, what to focus on]

SPACE: [2-3 sentences about the NASA image, accessible description, why it's wondrous, a brief spiritual or reflective angle]

SOLAR: [1-2 sentences about solar activity and its energetic significance]

RITUAL: [one practical moon ritual tip suited to this phase, concrete and doable]

SIGN_OFF: [one closing sentence, warm, cosmic, encouraging]

Format exactly as shown. Each section on its own line starting with the label in caps followed by a colon.

WRITING RULES, follow strictly:
${STYLE_RULES_PROMPT}
- No paradox framing ("X and Y are not opposites but...")
- The CTA button text must be specific to this week, use the NASA image title or moon phase name, not "Open Portal Astra"
- End the SIGN_OFF with something quotable and specific to this week's moon phase, not a generic blessing

ADDITIONAL INSTRUCTIONS (override earlier guidance where they conflict):

SUBJECT LINE: Reference the current moon phase and one specific content hook. Format: '[Moon phase]: [hook]'. Example: 'Waning Crescent: release what no longer fits'. Under 50 characters. No generic phrases.

PREHEADER: 60-80 character inbox preview teaser. Specific to this week. Return as field "preheader" on its own line: PREHEADER: [text]

TAROT: Card this week: ${weeklyCard.name}, keywords: ${tarotKeywords}. Write one sentence on this card's energy for the week (under 20 words) and one sentence on the action it calls for (under 20 words). No em dashes. Return as field "tarot" with subfields cardName, keywords, reading, the cardName and keywords are already known, so only return the reading on its own line: TAROT_READING: [two sentences]

ANGEL NUMBER: This week is ${angelNumber}. One-line meaning tied to the week, 10 words. Return as field "angelNumber" with subfields number, meaning, the number is already known, so only return the meaning on its own line: ANGEL_NUMBER_MEANING: [one line]

SOLAR: End the SOLAR section with one sentence starting 'This week:' tying space weather to a human grounding tip. Under 20 words.

CTA: Write a 4-6 word CTA referencing the moon phase. Example: 'Explore the Waning Crescent'. Return as field "ctaText" on its own line: CTA_TEXT: [4-6 words]

ADDITIONAL FIELDS, include these labeled lines in your response in addition to the original sections:
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
<title>${esc(p.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Mono',monospace,sans-serif;color:#e8e0ff;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(p.preheader)}</span>
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
        <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(232,224,255,0.85);">${esc(p.greeting)}</p>
      </td></tr>

      <!-- Moon -->
      <tr><td style="padding:24px 0;">
        <div style="background:rgba(155,138,255,0.06);border:1px solid rgba(155,138,255,0.15);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            ${esc(moon.emoji)} Moon Phase · ${esc(moon.name)}
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${esc(p.moon)}</p>
        </div>
      </td></tr>

      <!-- Tarot -->
      <tr><td style="padding:0 0 24px 0;"><a href="https://portalastra.com/?tab=tarot" style="text-decoration:none;display:block;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 20px;background:rgba(8,10,30,0.75);border:1px solid rgba(155,138,255,0.2);border-radius:10px;"><p style="margin:0 0 4px 0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">This week's tarot</p><p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#e8e0ff;">${esc(tarot.cardName)}</p><p style="margin:0 0 10px 0;font-size:12px;color:rgba(232,224,255,0.55);">${esc(tarot.keywords)}</p><p style="margin:0 0 10px 0;font-size:14px;color:rgba(232,224,255,0.85);line-height:1.7;">${esc(tarot.reading)}</p><p style="margin:0;font-size:12px;color:#9b8aff;">Draw your full reading →</p></td></tr></table></a></td></tr>

      <!-- Angel number -->
      <tr><td style="padding:0 0 24px 0;"><a href="https://portalastra.com/?tab=sky" style="text-decoration:none;display:block;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 16px;background:rgba(8,10,30,0.75);border:1px solid rgba(201,168,76,0.2);border-radius:10px;"><p style="margin:0 0 4px 0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">This week's angel number</p><p style="margin:0;font-size:14px;color:rgba(232,224,255,0.85);">${esc(angel.number)}: ${esc(angel.meaning)}</p></td></tr></table></a></td></tr>

      <!-- Space -->
      <tr><td style="padding:0 0 24px;">
        <div style="background:rgba(8,10,30,0.75);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            🌌 NASA · ${esc(apod.title)}
          </p>
          <img src="${escUrl(apod.hdurl || apod.url)}" alt="${esc(apod.title)}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:block;" />
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${esc(p.space)}</p>
        </div>
      </td></tr>

      <!-- Solar -->
      <tr><td style="padding:0 0 24px;">
        <div style="background:rgba(8,10,30,0.75);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#9b8aff;">
            ☀️ Solar Activity
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${esc(p.solar)}</p>
        </div>
      </td></tr>

      <!-- Ritual -->
      <tr><td style="padding:0 0 32px;">
        <div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:20px 24px;">
          <p style="margin:0 0 8px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#C9A84C;">
            ✨ This Week's Ritual
          </p>
          <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.8);">${esc(p.ritual)}</p>
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 0 32px;text-align:center;">
        <a href="https://www.portalastra.com"
          style="display:inline-block;background:rgba(155,138,255,0.2);border:1px solid rgba(155,138,255,0.35);
          border-radius:10px;padding:14px 32px;color:#c4b8ff;font-size:12px;letter-spacing:0.1em;
          text-decoration:none;text-transform:uppercase;">
          ${esc(p.ctaText)} →
        </a>
      </td></tr>

      <!-- Sign off -->
      <tr><td style="padding:0 0 32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:24px;">
        <p style="margin:0;font-size:14px;line-height:1.75;color:rgba(232,224,255,0.6);font-style:italic;">${esc(p.signOff)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:rgba(232,224,255,0.3);">The Portal Astra team</p>
      </td></tr>

      <!-- Footer (shared across all three generated emails) -->
      ${emailFooterHTML()}

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── MailerLite ──────────────────────────────────────────────────────────────

async function createAndScheduleCampaign(subject, htmlContent, scheduledAt) {
  // Step 1, Create campaign (draft)
  const createRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_KEY}`,
    },
    body: JSON.stringify({
      name: `Weekly Digest, ${new Date().toISOString().split('T')[0]}`,
      type: 'regular',
      emails: [{
        subject,
        from_name: 'Portal Astra',
        from:      'theportalastra@gmail.com',
        content:   htmlContent,
      }],
      groups: [FREE_GROUP_ID],
    }),
  })

  const campaign = await createRes.json()
  if (!campaign.data?.id) {
    console.error('Campaign creation failed:', JSON.stringify(campaign))
    throw new Error('Failed to create MailerLite campaign')
  }

  const campaignId = campaign.data.id
  console.log(`Campaign created: ${campaignId}`)

  // Step 2, Schedule campaign. Scheduling transitions the campaign from
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

  const today   = getTodayAEST()
  const moon    = getMoonPhase()
  const dateStr = formatDateLongAEST()

  console.log(`Moon: ${moon.name} | Date: ${dateStr}`)

  const [apod, solar] = await Promise.all([fetchAPOD(), fetchDONKI()])
  console.log(`APOD: ${apod.title} | Solar events: ${solar.count}`)

  // The card the site is showing as this week's Present position. Same deck,
  // same seed, same draw function, so the email and the site always agree.
  const weeklyCard  = getWeeklySpread(today).present
  const angelNumber = getAngelNumber(today)
  console.log(`Week of ${today} | Tarot: ${weeklyCard.name} ${weeklyCard.orientation} | Angel: ${angelNumber}`)

  // Generate, check the output against house style, retry once, then abort.
  // For an email there is no static fallback worth sending, so a second failure
  // stops the send rather than mailing copy that breaks the style rules to the
  // whole list.
  let parsed = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const rawEmail = await generateEmail({ moon, apod, solar, dateStr, weeklyCard, angelNumber })
    if (!rawEmail) {
      console.error(`Claude generation returned nothing (attempt ${attempt + 1})`)
      continue
    }

    const candidate = parseEmail(rawEmail)
    if (!candidate.subject) {
      console.error(`Could not parse subject line from Claude output (attempt ${attempt + 1})`)
      continue
    }

    const check = validateFields({
      subject: candidate.subject,
      preview: candidate.preview,
      greeting: candidate.greeting,
      moon: candidate.moon,
      space: candidate.space,
      solar: candidate.solar,
      ritual: candidate.ritual,
      signOff: candidate.signOff,
      preheader: candidate.preheader,
      tarotReading: candidate.tarotReading,
      angelMeaning: candidate.angelMeaning,
      ctaText: candidate.ctaText,
    })

    if (!check.ok) {
      console.error(`Output failed house style (attempt ${attempt + 1}): ${check.problems.join('; ')}`)
      continue
    }

    parsed = candidate
    break
  }

  if (!parsed) {
    throw new Error('Could not produce a digest that passes the output validator. Nothing sent.')
  }

  console.log(`Subject: ${parsed.subject}`)

  const tarot = {
    cardName: `${weeklyCard.name} (${weeklyCard.orientation})`,
    keywords: cardKeywords(weeklyCard),
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
