// scripts/check-eclipse-alerts.js
// Daily GitHub Actions cron. Detects upcoming supermoons and eclipses in the
// next 60 days and, 7 days before each event, sends a Paid-group-only alert
// email. Pure JS date math, no external astronomy libraries.
//
// The MailerLite create + schedule payload matches scripts/generate-weekly-digest.js
// exactly (same endpoint, Bearer auth, campaign body and schedule format).

const fs = require('fs')
const path = require('path')

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const NASA_API_KEY = process.env.NASA_API_KEY // reserved; date math needs no external API

// Paid group only — this is a premium alert.
const PAID_GROUP_ID = '189884548570416247'

const DAY = 86400000

// ─── Orbital constants ───────────────────────────────────────────────────────
// Synodic month and reference new moon follow the same lunar math pattern as
// scripts/generate-weekly-digest.js (Jan 6 2000 new moon).
const SYNODIC = 29.53059
const REF_NEW_MOON = Date.UTC(2000, 0, 6)

// Anomalistic (perigee) cycle for supermoon detection.
const ANOMALISTIC = 27.55455
const REF_PERIGEE = Date.UTC(2000, 0, 4)

// Eclipse-season cadence: the Sun returns to a lunar node about every 173.31
// days (half an eclipse year). A syzygy within 18 days of that crossing falls
// inside an eclipse season. This is a simplified seasonal model with an
// approximate reference node crossing, so eclipses are flagged as "potential".
const ECLIPSE_NODE_CYCLE = 173.31
const REF_NODE = Date.UTC(2000, 0, 6)

const STATE_PATH = path.join(__dirname, 'eclipse-alert-state.json')

// ─── Date math helpers ───────────────────────────────────────────────────────

// Return the new and full moons that fall within [startMs, endMs].
function newAndFullMoons(startMs, endMs) {
  const daysSinceRef = (startMs - REF_NEW_MOON) / DAY
  const cyclePos = ((daysSinceRef % SYNODIC) + SYNODIC) % SYNODIC
  const firstNewMoon = startMs - cyclePos * DAY // most recent new moon at/before start
  const events = []
  for (let k = 0; k <= 4; k++) {
    const nm = firstNewMoon + k * SYNODIC * DAY
    const fm = nm + (SYNODIC / 2) * DAY
    if (nm >= startMs && nm <= endMs) events.push({ phase: 'new', timeMs: nm })
    if (fm >= startMs && fm <= endMs) events.push({ phase: 'full', timeMs: fm })
  }
  return events.sort((a, b) => a.timeMs - b.timeMs)
}

// A full moon is a supermoon when it lands within 3 days of perigee.
function isSupermoon(fullMoonMs) {
  const d = (fullMoonMs - REF_PERIGEE) / DAY
  const pos = ((d % ANOMALISTIC) + ANOMALISTIC) % ANOMALISTIC
  const distToPerigee = Math.min(pos, ANOMALISTIC - pos)
  return distToPerigee <= 3
}

// A syzygy is in an eclipse season when it is within 18 days of a node crossing.
function inEclipseSeason(syzygyMs) {
  const d = (syzygyMs - REF_NODE) / DAY
  const pos = ((d % ECLIPSE_NODE_CYCLE) + ECLIPSE_NODE_CYCLE) % ECLIPSE_NODE_CYCLE
  const distToNode = Math.min(pos, ECLIPSE_NODE_CYCLE - pos)
  return distToNode <= 18
}

function isoDate(ms) {
  return new Date(ms).toISOString().split('T')[0]
}

function labelDate(ms) {
  return new Date(ms).toLocaleDateString('en-AU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Event detection ─────────────────────────────────────────────────────────

function makeEvent(kind, name, timeMs) {
  return { kind, name, timeMs, dateISO: isoDate(timeMs), dateLabel: labelDate(timeMs) }
}

const ASTRO_CONTEXT = {
  'supermoon': 'A full moon near its closest approach to Earth, so it appears slightly larger and brighter.',
  'lunar-eclipse': 'Earth moves between the Sun and Moon, casting its shadow across the full moon.',
  'solar-eclipse': 'The new moon passes between Earth and the Sun, hiding part or all of the solar disc.',
  'supermoon-lunar-eclipse': 'A lunar eclipse that lands on a supermoon, so the shadowed moon also looks larger.',
}

// Only supermoons and eclipses are alert-worthy. Ordinary new and full moons
// are ignored here.
function detectEvents(nowMs) {
  const moons = newAndFullMoons(nowMs, nowMs + 60 * DAY)
  const events = []
  for (const m of moons) {
    if (m.phase === 'full') {
      const eclipse = inEclipseSeason(m.timeMs)
      const supermoon = isSupermoon(m.timeMs)
      if (eclipse && supermoon) {
        events.push(makeEvent('supermoon-lunar-eclipse', 'Supermoon Lunar Eclipse', m.timeMs))
      } else if (eclipse) {
        events.push(makeEvent('lunar-eclipse', 'Lunar Eclipse', m.timeMs))
      } else if (supermoon) {
        events.push(makeEvent('supermoon', 'Supermoon', m.timeMs))
      }
    } else if (inEclipseSeason(m.timeMs)) {
      events.push(makeEvent('solar-eclipse', 'Solar Eclipse', m.timeMs))
    }
  }
  return events
}

// ─── Claude generation ───────────────────────────────────────────────────────

async function generateAlert(event) {
  const prompt = `You are writing a short premium email alert for Portal Astra (portalastra.com), a space and astrology platform.

This alert goes to paid subscribers about an upcoming sky event, seven days ahead.

Event: ${event.name}
Date: ${event.dateLabel}
Astronomy: ${ASTRO_CONTEXT[event.kind]}

Write exactly three paragraphs:
1. Announce the event and its date warmly.
2. Explain what is happening astronomically, in plain language.
3. Explain what it means energetically, plus one grounded thing to do.

Rules:
- No em dashes anywhere
- Never use the words: eternal, forever, tapestry, dance, infinite
- Sentences under 25 words
- Mystical but grounded tone, scientific but accessible
- Mention the event name and the date

Return only JSON with this exact shape:
{"subject": "...", "paragraphs": ["...", "...", "..."]}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Claude API error:', res.status, JSON.stringify(data).slice(0, 300))
    return null
  }

  const text = data.content?.[0]?.text || ''
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed.subject || !Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
      throw new Error('missing subject or paragraphs')
    }
    return parsed
  } catch (err) {
    console.error('Failed to parse Claude JSON:', err.message, '| raw:', text.slice(0, 300))
    return null
  }
}

// ─── Build HTML email ────────────────────────────────────────────────────────
// Dark template matching generate-monthly-forecast.js (background #04060f,
// purple #9b8aff, gold #C9A84C, DM Mono font).

function buildAlertHTML(event, alert) {
  const paragraphsHTML = (alert.paragraphs || []).map(p => `
          <tr>
            <td style="padding: 0 0 20px 0;">
              <p style="margin: 0; font-size: 15px; color: rgba(232,224,255,0.85); line-height: 1.8;">${p}</p>
            </td>
          </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${alert.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #04060f; font-family: 'DM Mono', 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #04060f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.07);">
              <p style="margin: 0 0 8px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(232,224,255,0.4);">Portal Astra · Premium</p>
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 700; color: #e8e0ff; font-family: Georgia, serif; letter-spacing: 0.04em;">
                ${event.name}
              </h1>
              <p style="margin: 0; font-size: 12px; color: #C9A84C; letter-spacing: 0.08em;">${event.dateLabel} · seven days away</p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="padding: 32px 0 0 0;"></td></tr>

          <!-- Body paragraphs -->
          ${paragraphsHTML}

          <!-- Closing -->
          <tr>
            <td style="padding: 12px 0 40px 0; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 32px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #9b8aff;">Portal Astra</p>
              <p style="margin: 0; font-size: 11px; color: rgba(232,224,255,0.4);">Your premium sky alert</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.07); text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: rgba(232,224,255,0.3);">
                <a href="https://portalastra.com" style="color: #9b8aff; text-decoration: none;">portalastra.com</a>
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(232,224,255,0.2);">
                You received this as an Astra Premium subscriber.
                <a href="{$unsubscribe}" style="color: rgba(232,224,255,0.3);">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── MailerLite ──────────────────────────────────────────────────────────────
// Matches the create + schedule pattern in scripts/generate-weekly-digest.js.

async function createAndScheduleCampaign(name, subject, htmlContent, scheduledAt) {
  // Step 1 — Create campaign (draft), Paid group only.
  const createRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify({
      name,
      type: 'regular',
      emails: [{
        subject,
        from_name: 'Portal Astra',
        from:      'theportalastra@gmail.com',
        content:   htmlContent,
      }],
      groups: [PAID_GROUP_ID],
    }),
  })

  const campaign = await createRes.json()
  if (!campaign.data?.id) {
    console.error('Campaign creation failed:', JSON.stringify(campaign))
    throw new Error('Failed to create MailerLite campaign')
  }

  const campaignId = campaign.data.id
  console.log(`Campaign created: ${campaignId}`)

  // Step 2 — Schedule. MailerLite needs schedule.date plus separate
  // schedule.hours and schedule.minutes (UTC), not a single datetime string.
  const scheduleDate = new Date(scheduledAt)
  const scheduleRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
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

// ─── State (sent-alert tracking) ─────────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
    }
  } catch (err) {
    console.error('Could not read state file, starting fresh:', err.message)
  }
  // Create as an empty object if it does not exist yet.
  fs.writeFileSync(STATE_PATH, JSON.stringify({}, null, 2))
  return {}
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Portal Astra eclipse/supermoon alert check starting...')

  const nowMs = Date.now()
  const state = loadState()

  const events = detectEvents(nowMs)
  console.log(
    `Detected ${events.length} alert-worthy event(s) in the next 60 days: ` +
    (events.map(e => `${e.name} ${e.dateISO}`).join(', ') || 'none')
  )

  // Schedule any sends for today at 11:00 UTC.
  const sendTime = new Date()
  sendTime.setUTCHours(11, 0, 0, 0)
  const scheduledAt = sendTime.toISOString()

  let sentCount = 0
  for (const event of events) {
    const daysAway = Math.round((event.timeMs - nowMs) / DAY)
    if (daysAway < 6 || daysAway > 8) continue // 7 days away, +/- 1 day window

    if (state[event.dateISO]) {
      console.log(`Already alerted for ${event.name} on ${event.dateISO}, skipping.`)
      continue
    }

    console.log(`${event.name} is ${daysAway} days away. Generating alert...`)
    const alert = await generateAlert(event)
    if (!alert) {
      console.error(`Alert generation failed for ${event.name}; will retry on the next run.`)
      continue
    }

    const html = buildAlertHTML(event, alert)
    const campaignName = `Sky Alert — ${event.name} ${event.dateISO}`
    const campaignId = await createAndScheduleCampaign(campaignName, alert.subject, html, scheduledAt)

    state[event.dateISO] = {
      name: event.name,
      sentAt: new Date().toISOString(),
      campaignId,
    }
    saveState(state)
    sentCount++
    console.log(`Alert scheduled for ${event.name} (${event.dateISO}).`)
  }

  if (sentCount === 0) {
    console.log('No alerts needed today.')
  } else {
    console.log(`Done. ${sentCount} alert(s) scheduled.`)
  }
}

main().catch(err => {
  console.error('Eclipse alert check failed:', err)
  process.exit(1)
})
