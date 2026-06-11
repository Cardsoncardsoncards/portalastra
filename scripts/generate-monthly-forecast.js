// scripts/generate-monthly-forecast.js
// Monthly cosmic forecast email — targets Portal Astra Paid group only
// Runs 1st of each month via GitHub Actions cron
// Content: full month astrology overview, major lunar events, space weather forecast, ritual calendar

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const NASA_API_KEY = process.env.NASA_API_KEY

// Paid group only — this is a premium email
const PAID_GROUP_ID = '189884548570416247'

// ─── Lunar phase calculator ──────────────────────────────────────────────────

function getLunarEventsForMonth(year, month) {
  // Approximate new and full moon dates for a given month
  // Using known reference: Jan 6 2000 was New Moon
  const referenceNewMoon = new Date('2000-01-06T18:14:00Z')
  const synodicMonth = 29.53058867

  const events = []
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0)

  // Find all new and full moons within the month
  let daysSinceRef = (startOfMonth.getTime() - referenceNewMoon.getTime()) / 86400000
  let cyclePosition = ((daysSinceRef % synodicMonth) + synodicMonth) % synodicMonth

  // Step back to previous new moon
  let currentDate = new Date(startOfMonth.getTime() - (cyclePosition * 86400000))

  // Walk forward through the month finding phase events
  while (currentDate <= endOfMonth) {
    const newMoonDate = new Date(currentDate)
    const fullMoonDate = new Date(currentDate.getTime() + (synodicMonth / 2 * 86400000))

    if (newMoonDate >= startOfMonth && newMoonDate <= endOfMonth) {
      events.push({
        type: 'New Moon',
        date: newMoonDate.toISOString().split('T')[0],
        emoji: '🌑',
      })
    }

    if (fullMoonDate >= startOfMonth && fullMoonDate <= endOfMonth) {
      events.push({
        type: 'Full Moon',
        date: fullMoonDate.toISOString().split('T')[0],
        emoji: '🌕',
      })
    }

    currentDate = new Date(currentDate.getTime() + (synodicMonth * 86400000))
  }

  // Add quarter moons
  const firstQuarterDate = new Date(startOfMonth)
  const lastQuarterDate = new Date(endOfMonth)
  // Approximate first and last quarter by walking from new moon
  events.sort((a, b) => a.date.localeCompare(b.date))

  return events
}

function getMonthName(month) {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return names[month - 1]
}

// ─── NASA APOD fetch ─────────────────────────────────────────────────────────

async function fetchMonthAPOD() {
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}&thumbs=true`)
    const data = await res.json()
    return {
      title: data.title || 'Astronomy Picture of the Day',
      explanation: data.explanation ? data.explanation.substring(0, 300) + '...' : '',
      url: data.media_type === 'video' ? (data.thumbnail_url || '') : (data.url || ''),
      hdurl: data.hdurl || data.url || '',
    }
  } catch (err) {
    console.error('APOD fetch failed:', err.message)
    return null
  }
}

// ─── Claude forecast generation ──────────────────────────────────────────────

async function generateForecast(month, year, lunarEvents, apod) {
  const monthName = getMonthName(month)

  const lunarEventsList = lunarEvents.map(e => `${e.type} on ${e.date}`).join(', ')

  const prompt = `You are writing the monthly cosmic forecast email for Portal Astra (portalastra.com), a space and astrology platform.

This email goes to premium paid subscribers only. It should feel elevated, thoughtful, and worth the subscription.

Month: ${monthName} ${year}
Lunar events this month: ${lunarEventsList || 'Standard lunar cycle — check for specific dates'}
Today's NASA image title: ${apod?.title || 'Not available'}

Write the monthly cosmic forecast with these exact sections:

1. SUBJECT LINE — compelling, specific to ${monthName}. No em dashes. Under 50 characters.

2. OPENING (2-3 sentences) — set the tone for ${monthName}. What energy does this month carry? Be specific to the lunar events listed above. No generic statements.

3. KEY LUNAR MOMENTS — for each lunar event listed, write 2-3 sentences about what it means energetically and what to do/focus on. Be specific and practical.

4. MONTHLY ASTROLOGY OVERVIEW — 3-4 sentences covering the broad astrological themes of ${monthName}. Focus on what people can actually use.

5. SPACE WEATHER WATCH — 2-3 sentences about what to watch in the night sky this month. Tie in the NASA image if relevant.

6. RITUAL FOCUS FOR THE MONTH — one specific ritual practice or focus for ${monthName}. Be concrete, not vague.

7. CLOSING (1-2 sentences) — warm, grounded. No em dashes. No words: eternal, forever, tapestry, dance, infinite.

Rules:
- No em dashes anywhere
- No words: eternal, forever, tapestry, dance, infinite, profound
- Sentences under 25 words
- Tone: mystical but grounded, scientific but accessible
- Sign off as: Portal Astra

Return your response as JSON with these exact keys:
{
  "subject": "...",
  "opening": "...",
  "lunarMoments": [{"event": "...", "date": "...", "guidance": "..."}],
  "astrologyOverview": "...",
  "spaceWatch": "...",
  "ritualFocus": "...",
  "closing": "..."
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.error('JSON parse failed — raw response:', text.substring(0, 500))
    throw new Error('Claude did not return valid JSON')
  }
}

// ─── Build HTML email ────────────────────────────────────────────────────────

function buildEmailHTML(forecast, month, year, lunarEvents, apod) {
  const monthName = getMonthName(month)

  const lunarEventsHTML = (forecast.lunarMoments || []).map(event => `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 16px; background: rgba(155,138,255,0.06); border: 1px solid rgba(155,138,255,0.15); border-radius: 10px;">
              <p style="margin: 0 0 6px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9b8aff;">${event.event || ''} · ${event.date || ''}</p>
              <p style="margin: 0; font-size: 14px; color: rgba(232,224,255,0.85); line-height: 1.7;">${event.guidance || ''}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const apodSection = apod?.url ? `
    <tr>
      <td style="padding: 0 0 32px 0;">
        <p style="margin: 0 0 12px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #C9A84C;">NASA · This Month's Sky</p>
        <img src="${apod.url}" alt="${apod.title}" style="width: 100%; border-radius: 10px; display: block; margin-bottom: 10px;" />
        <p style="margin: 0; font-size: 12px; color: rgba(232,224,255,0.5); font-style: italic;">${apod.title}</p>
      </td>
    </tr>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${forecast.subject}</title>
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
                ${monthName} ${year} Cosmic Forecast
              </h1>
              <p style="margin: 0; font-size: 12px; color: #C9A84C; letter-spacing: 0.08em;">Your premium monthly reading</p>
            </td>
          </tr>

          <!-- Opening -->
          <tr>
            <td style="padding: 32px 0 24px 0;">
              <p style="margin: 0; font-size: 15px; color: rgba(232,224,255,0.85); line-height: 1.8;">${forecast.opening}</p>
            </td>
          </tr>

          <!-- Lunar Moments -->
          <tr>
            <td style="padding: 0 0 8px 0;">
              <p style="margin: 0 0 16px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #C9A84C;">Key Lunar Moments</p>
            </td>
          </tr>
          ${lunarEventsHTML}

          <!-- Astrology Overview -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <p style="margin: 0 0 10px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #C9A84C;">Monthly Astrology</p>
              <p style="margin: 0; font-size: 14px; color: rgba(232,224,255,0.85); line-height: 1.8;">${forecast.astrologyOverview}</p>
            </td>
          </tr>

          <!-- NASA Image -->
          ${apodSection}

          <!-- Space Watch -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <p style="margin: 0 0 10px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #C9A84C;">Space Weather Watch</p>
              <p style="margin: 0; font-size: 14px; color: rgba(232,224,255,0.85); line-height: 1.8;">${forecast.spaceWatch}</p>
            </td>
          </tr>

          <!-- Ritual Focus -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 20px 24px; background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.25); border-radius: 12px;">
                    <p style="margin: 0 0 10px 0; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #C9A84C;">Ritual Focus for ${monthName}</p>
                    <p style="margin: 0; font-size: 14px; color: rgba(232,224,255,0.85); line-height: 1.8; font-style: italic; font-family: Georgia, serif;">"${forecast.ritualFocus}"</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 0 40px 0; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: rgba(232,224,255,0.75); line-height: 1.8;">${forecast.closing}</p>
              <p style="margin: 0; font-size: 13px; color: #9b8aff;">Portal Astra</p>
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

// ─── Create MailerLite campaign ──────────────────────────────────────────────

async function createMailerLiteCampaign(subject, htmlContent, month, year) {
  const monthName = getMonthName(month)

  // Create campaign
  const createRes = await fetch('https://connect.mailerlite.com/api/campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify({
      name: `Monthly Forecast — ${monthName} ${year}`,
      type: 'regular',
      status: 'draft',
      emails: [{
        subject: subject,
        from_name: 'Portal Astra',
        from: 'theportalastra@gmail.com',
        content: htmlContent,
      }],
      groups: [PAID_GROUP_ID],
    }),
  })

  const campaign = await createRes.json()

  if (!createRes.ok) {
    console.error('Campaign creation failed:', JSON.stringify(campaign))
    throw new Error(`Campaign creation failed: ${campaign.message || createRes.status}`)
  }

  console.log('Campaign created:', campaign.data?.id)

  // Schedule for today at 7pm AEST (9am UTC — but this cron runs at 9am UTC on the 1st)
  // We schedule for the same day at 11am UTC to give a buffer
  const now = new Date()
  const scheduleDate = new Date(now)
  scheduleDate.setUTCHours(11, 0, 0, 0)
  if (scheduleDate <= now) {
    scheduleDate.setUTCDate(scheduleDate.getUTCDate() + 1)
  }

  const scheduleStr = scheduleDate.toISOString().replace('T', ' ').substring(0, 19)

  // Match the proven schedule payload from generate-weekly-digest.js: MailerLite
  // expects schedule.date plus separate schedule.hours and schedule.minutes (UTC),
  // not a single datetime string with timezone_id.
  const scheduleRes = await fetch(`https://connect.mailerlite.com/api/campaigns/${campaign.data.id}/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
    },
    body: JSON.stringify({
      delivery: 'scheduled',
      schedule: {
        date: scheduleDate.toISOString().split('T')[0],
        hours: String(scheduleDate.getUTCHours()).padStart(2, '0'),
        minutes: String(scheduleDate.getUTCMinutes()).padStart(2, '0'),
      },
    }),
  })

  const scheduleData = await scheduleRes.json()

  if (!scheduleRes.ok) {
    console.error('Schedule failed:', JSON.stringify(scheduleData))
    throw new Error(`Schedule failed: ${scheduleData.message || scheduleRes.status}`)
  }

  console.log('Campaign scheduled for:', scheduleStr)
  return campaign.data?.id
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const now = new Date()
  const month = now.getUTCMonth() + 1
  const year = now.getUTCFullYear()
  const monthName = getMonthName(month)

  console.log(`Generating monthly forecast for ${monthName} ${year}...`)

  // 1. Get lunar events for the month
  const lunarEvents = getLunarEventsForMonth(year, month)
  console.log(`Found ${lunarEvents.length} lunar events:`, lunarEvents.map(e => `${e.type} ${e.date}`).join(', '))

  // 2. Fetch NASA APOD
  console.log('Fetching APOD...')
  const apod = await fetchMonthAPOD()
  console.log('APOD:', apod?.title || 'not available')

  // 3. Generate forecast with Claude
  console.log('Generating forecast with Claude...')
  const forecast = await generateForecast(month, year, lunarEvents, apod)
  console.log('Subject line:', forecast.subject)

  // 4. Build HTML
  const html = buildEmailHTML(forecast, month, year, lunarEvents, apod)

  // 5. Create and schedule MailerLite campaign
  console.log('Creating MailerLite campaign (Paid group only)...')
  const campaignId = await createMailerLiteCampaign(forecast.subject, html, month, year)

  console.log(`Done. Campaign ID: ${campaignId}`)
  console.log(`Monthly forecast for ${monthName} ${year} is scheduled.`)
}

main().catch(err => {
  console.error('Monthly forecast failed:', err)
  process.exit(1)
})
