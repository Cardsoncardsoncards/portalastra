// scripts/check-eclipse-alerts.js
// Daily GitHub Actions cron. Sends a Paid-group-only alert email exactly seven
// days before each verified eclipse, and before supermoons.
//
// Eclipses come from the shared verified date table (src/lib/shared/astronomy.js),
// the same table the Moon page displays. They are NOT computed. The previous
// version derived them from a "syzygy within ±18 days of a mean node crossing"
// seasonal model, which is not how eclipse prediction works: that model flags
// roughly a third of all new and full moons as eclipses, and it was untestable
// against real data because it had no real data to test against.
//
// De-duplication: the alert fires only when an event is EXACTLY seven days
// away, compared at whole-UTC-day granularity. Only one daily run can ever
// satisfy that, so no state file is needed. The previous version used a ±1-day
// window plus a JSON state file that is gitignored and lives in a fresh
// checkout every run, so it never persisted and any detected event would have
// sent on three consecutive days.
//
// The MailerLite create + schedule payload matches scripts/generate-weekly-digest.js
// exactly (same endpoint, Bearer auth, campaign body and schedule format).

const {
  ECLIPSES,
  PAID_GROUP_ID,
  SYNODIC_MONTH,
  KNOWN_NEW_MOON,
  ANOMALISTIC_MONTH,
  KNOWN_PERIGEE,
  esc,
  emailFooterHTML,
  validateFields,
  STYLE_RULES_PROMPT,
} = require('../src/lib/shared')

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const DAY = 86400000

// Alert lead time, in whole days. Exactly this, not a range.
const LEAD_DAYS = 7

// Supermoon detection is still computed, because a supermoon genuinely is just
// "full moon near perigee" and mean-motion maths gets that close. Eclipses are
// not like that.
//
// The constants come from the shared moon module rather than being restated
// here. This script previously used its own epochs (new moon at 2000-01-06
// 00:00 instead of 18:14, perigee at 2000-01-04 instead of 2024-01-13), so its
// idea of the next supermoon drifted away from the one the Moon page displays.
// See DISC-002.
const SYNODIC = SYNODIC_MONTH
const REF_NEW_MOON = KNOWN_NEW_MOON
const ANOMALISTIC = ANOMALISTIC_MONTH
const REF_PERIGEE = KNOWN_PERIGEE

// ─── Date math helpers ───────────────────────────────────────────────────────

function isoDate(ms) {
  return new Date(ms).toISOString().split('T')[0]
}

function labelDate(dateISO) {
  const [y, m, d] = dateISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Midnight UTC of the day containing `ms`. */
function utcMidnight(ms) {
  const d = new Date(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Whole UTC days from the day containing `nowMs` to the day `dateISO`. */
function daysUntil(dateISO, nowMs) {
  const [y, m, d] = dateISO.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - utcMidnight(nowMs)) / DAY)
}

// Return the full moons that fall within [startMs, endMs].
function fullMoons(startMs, endMs) {
  const daysSinceRef = (startMs - REF_NEW_MOON) / DAY
  const cyclePos = ((daysSinceRef % SYNODIC) + SYNODIC) % SYNODIC
  const firstNewMoon = startMs - cyclePos * DAY
  const events = []
  for (let k = 0; k <= 4; k++) {
    const fm = firstNewMoon + k * SYNODIC * DAY + (SYNODIC / 2) * DAY
    if (fm >= startMs && fm <= endMs) events.push(fm)
  }
  return events.sort((a, b) => a - b)
}

// A full moon is a supermoon when it lands within 3 days of perigee.
function isSupermoon(fullMoonMs) {
  const d = (fullMoonMs - REF_PERIGEE) / DAY
  const pos = ((d % ANOMALISTIC) + ANOMALISTIC) % ANOMALISTIC
  const distToPerigee = Math.min(pos, ANOMALISTIC - pos)
  return distToPerigee <= 3
}

// ─── Event detection ─────────────────────────────────────────────────────────

const ASTRO_CONTEXT = {
  'supermoon': 'A full moon near its closest approach to Earth, so it appears slightly larger and brighter.',
  'lunar-eclipse': 'Earth moves between the Sun and Moon, casting its shadow across the full moon.',
  'solar-eclipse': 'The new moon passes between Earth and the Sun, hiding part or all of the solar disc.',
}

function makeEvent(kind, name, dateISO) {
  return { kind, name, dateISO, dateLabel: labelDate(dateISO) }
}

/**
 * Every alert-worthy event in the next 60 days: verified eclipses read from
 * the shared table, plus computed supermoons. Exported for offline testing.
 */
function detectEvents(nowMs) {
  const horizon = nowMs + 60 * DAY
  const events = []

  for (const e of ECLIPSES) {
    const days = daysUntil(e.date, nowMs)
    if (days >= 0 && days <= 60) {
      events.push(makeEvent(e.kind, e.label, e.date))
    }
  }

  const eclipseDates = new Set(ECLIPSES.map((e) => e.date))
  for (const fm of fullMoons(nowMs, horizon)) {
    if (!isSupermoon(fm)) continue
    const dateISO = isoDate(fm)
    // A full moon that is already a listed lunar eclipse is announced as the
    // eclipse, not twice.
    if (eclipseDates.has(dateISO)) continue
    events.push(makeEvent('supermoon', 'Supermoon', dateISO))
  }

  return events.sort((a, b) => a.dateISO.localeCompare(b.dateISO))
}

/**
 * The events that should be alerted on for a given run time: exactly
 * LEAD_DAYS whole UTC days away. Exported for offline testing.
 */
function eventsDueOn(nowMs) {
  return detectEvents(nowMs).filter((e) => daysUntil(e.dateISO, nowMs) === LEAD_DAYS)
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
${STYLE_RULES_PROMPT}
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

    // House style check before anything is sent.
    const check = validateFields(Object.assign(
      { subject: parsed.subject },
      ...parsed.paragraphs.map((p, i) => ({ [`paragraph[${i}]`]: p })),
    ))
    if (!check.ok) {
      console.error(`Alert output failed house style: ${check.problems.join('; ')}`)
      return null
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
              <p style="margin: 0; font-size: 15px; color: rgba(232,224,255,0.85); line-height: 1.8;">${esc(p)}</p>
            </td>
          </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(alert.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #04060f; font-family: 'DM Mono', 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #04060f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.07);">
              <img src="https://www.portalastra.com/images/portalastralogohorizontal.png" alt="Portal Astra" width="220" style="display:block;margin:0 auto 12px;" />
              <p style="margin: 0 0 8px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(232,224,255,0.4);">Portal Astra · Premium</p>
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 700; color: #e8e0ff; font-family: Georgia, serif; letter-spacing: 0.04em;">
                ${esc(event.name)}
              </h1>
              <p style="margin: 0; font-size: 12px; color: #C9A84C; letter-spacing: 0.08em;">${esc(event.dateLabel)} · seven days away</p>
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

          <!-- Footer (shared across all three generated emails) -->
          ${emailFooterHTML()}

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
  // Step 1, Create campaign (draft), Paid group only.
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

  // Step 2, Schedule. MailerLite needs schedule.date plus separate
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Portal Astra eclipse/supermoon alert check starting...')

  const nowMs = Date.now()

  const upcoming = detectEvents(nowMs)
  console.log(
    `${upcoming.length} alert-worthy event(s) in the next 60 days: ` +
    (upcoming.map(e => `${e.name} ${e.dateISO} (${daysUntil(e.dateISO, nowMs)}d)`).join(', ') || 'none')
  )

  const due = eventsDueOn(nowMs)

  // Schedule any sends for today at 11:00 UTC.
  const sendTime = new Date()
  sendTime.setUTCHours(11, 0, 0, 0)
  const scheduledAt = sendTime.toISOString()

  let sentCount = 0
  for (const event of due) {
    console.log(`${event.name} is exactly ${LEAD_DAYS} days away. Generating alert...`)
    // One retry, then skip. There is no static fallback worth mailing.
    let alert = await generateAlert(event)
    if (!alert) alert = await generateAlert(event)
    if (!alert) {
      // No retry-tomorrow safety net exists any more, because the exact-7-day
      // window is what guarantees a single send. A generation failure means
      // this alert is skipped; that is the deliberate trade for never
      // double-sending.
      console.error(`Alert generation failed for ${event.name}; this alert will not be sent.`)
      continue
    }

    const html = buildAlertHTML(event, alert)
    const campaignName = `Sky Alert: ${event.name} ${event.dateISO}`
    const campaignId = await createAndScheduleCampaign(campaignName, alert.subject, html, scheduledAt)

    sentCount++
    console.log(`Alert scheduled for ${event.name} (${event.dateISO}), campaign ${campaignId}.`)
  }

  if (sentCount === 0) {
    console.log('No alerts needed today.')
  } else {
    console.log(`Done. ${sentCount} alert(s) scheduled.`)
  }
}

module.exports = { detectEvents, eventsDueOn, daysUntil, LEAD_DAYS }

// Only run when invoked directly, so the detector can be driven offline by the
// test harness without firing any network calls.
if (require.main === module) {
  main().catch(err => {
    console.error('Eclipse alert check failed:', err)
    process.exit(1)
  })
}
