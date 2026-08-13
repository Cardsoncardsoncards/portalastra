'use strict'

// Verified sky-event dates. One table, read by both the Moon page display list
// and the eclipse alert cron job.
//
// PROVENANCE: the 2026 eclipse dates below are NASA/USNO sourced and were
// confirmed against those sources on 2026-08-13. Do not add an entry here
// without checking it against a primary source first; the whole point of this
// table is that everything in it is known-good.
//
// What this replaces: the Moon page carried a hand-typed array that had the
// February 2026 annular eclipse on the 6th (it is the 17th) and was missing
// both lunar eclipses entirely, and scripts/check-eclipse-alerts.js carried a
// seasonal "±18 days from a node crossing" model that guessed at eclipse dates
// from orbital averages. Eclipses do not fall out of a mean-motion model; they
// come from a published table.

/** @typedef {{ date: string, label: string, kind: 'solar-eclipse' | 'lunar-eclipse' }} SkyEvent */

/** Verified. Safe to display and to alert on. */
const ECLIPSES = [
  { date: '2026-02-17', label: 'Annular Solar Eclipse', kind: 'solar-eclipse' },
  { date: '2026-03-03', label: 'Total Lunar Eclipse',   kind: 'lunar-eclipse' },
  { date: '2026-08-12', label: 'Total Solar Eclipse',   kind: 'solar-eclipse' },
  { date: '2026-08-28', label: 'Partial Lunar Eclipse', kind: 'lunar-eclipse' },
]

// NOT verified against a primary source, and therefore NOT displayed and NOT
// alerted on. It was previously listed on the Moon page alongside the 2026
// dates with nothing to distinguish it. It stays here as a note to whoever does
// the 2027+ verification pass (see DISC-001 in audit-new-discoveries.md), not
// as data the site is willing to show a visitor.
const UNVERIFIED_ECLIPSES = [
  { date: '2027-08-02', label: 'Total Solar Eclipse', kind: 'solar-eclipse' },
]

// Mercury retrograde windows for 2026. Confirmed against three independent
// sources on 2026-08-13. The mercury-retrograde-2026 blog post previously
// stated different dates for all three windows.
const MERCURY_RETROGRADE_2026 = [
  { start: '2026-02-26', end: '2026-03-20', sign: 'Pisces'  },
  { start: '2026-06-29', end: '2026-07-23', sign: 'Cancer'  },
  { start: '2026-10-24', end: '2026-11-13', sign: 'Scorpio' },
]

/** Eclipses on or after `todayISO`, soonest first. */
function upcomingEclipses(todayISO) {
  return ECLIPSES
    .filter((e) => e.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
}

module.exports = {
  ECLIPSES,
  UNVERIFIED_ECLIPSES,
  MERCURY_RETROGRADE_2026,
  upcomingEclipses,
}
