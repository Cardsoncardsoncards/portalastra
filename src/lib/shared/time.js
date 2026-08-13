'use strict'

// Shared date helpers. Plain CommonJS so both src/ (via webpack) and the
// scripts/ cron jobs (via require) use the identical implementation.
//
// Every "today" in Portal Astra is an Australian Eastern date. Computing it
// from Intl with an explicit timeZone means the server and the browser agree,
// which is what removes the Navbar hydration mismatch.

const SITE_TIME_ZONE = 'Australia/Sydney'

/**
 * Today's date in Australia/Sydney as `YYYY-MM-DD`.
 * Built from formatToParts rather than a locale string so the shape is fixed
 * regardless of the host's default locale.
 */
function getTodayAEST(date) {
  const d = date || new Date()
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const get = (type) => {
    const part = parts.find((p) => p.type === type)
    return part ? part.value : ''
  }

  return `${get('year')}-${get('month')}-${get('day')}`
}

/** e.g. "Thursday, 13 August 2026", pinned to the site time zone. */
function formatDateLongAEST(date) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: SITE_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date || new Date())
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** `2026-08-13` -> `Aug 13, 2026`. Pure string work, no timezone involved. */
function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-')
  const monthIndex = Number(m) - 1
  if (!SHORT_MONTHS[monthIndex]) return String(dateStr)
  return `${SHORT_MONTHS[monthIndex]} ${Number(d)}, ${y}`
}

/** `2026-08-13` -> `Thursday, 13 August 2026`, from a date-only string. */
function formatISOLong(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

module.exports = {
  SITE_TIME_ZONE,
  getTodayAEST,
  formatDateLongAEST,
  formatDate,
  formatISOLong,
}
