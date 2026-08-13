'use strict'

// Single source of truth for lunar maths.
//
// Promoted verbatim from the MoonClient.tsx implementation, which is the one
// that was actually correct: it uses the real synodic month (29.53059 days),
// the real Jan 6 2000 18:14 UTC new-moon epoch, and rounds to the nearest of
// the eight named phases instead of bucketing by hand-written thresholds.
// The versions previously in src/lib/utils.ts, Navbar.tsx, CalendarsClient.tsx
// and scripts/generate-weekly-digest.js all disagreed with it and with each
// other; they are gone.

const SYNODIC_MONTH = 29.53059
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

// Anomalistic (perigee-to-perigee) month, used for the real distance figure.
const ANOMALISTIC_MONTH = 27.55455
const KNOWN_PERIGEE = Date.UTC(2024, 0, 13)

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]

const PHASE_EMOJIS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

/**
 * Moon phase for a given instant.
 * Returns the phase name and emoji, the illuminated percentage, the moon's
 * age in days, and the raw cycle fraction.
 */
function getMoonPhase(date) {
  const d = date || new Date()
  const days = (d.getTime() - KNOWN_NEW_MOON) / 86400000
  let age = days % SYNODIC_MONTH
  if (age < 0) age += SYNODIC_MONTH
  const frac = age / SYNODIC_MONTH
  const illumination = Math.round(((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100)
  const index = Math.floor(frac * 8 + 0.5) % 8
  return {
    name: PHASE_NAMES[index],
    emoji: PHASE_EMOJIS[index],
    index,
    illumination,
    age,
    frac,
  }
}

/**
 * Earth-Moon distance in km, from the anomalistic cycle.
 *
 * This is the physically meaningful figure: distance tracks the perigee cycle
 * (27.55 days), not the phase cycle (29.53 days). The old phase-based formula
 * on the Moon page implied distance was a function of illumination, which is
 * simply not how the orbit works. Still an approximation, but the right shape.
 */
function getMoonDistanceKm(date) {
  const d = date || new Date()
  let p = ((d.getTime() - KNOWN_PERIGEE) / 86400000) % ANOMALISTIC_MONTH
  if (p < 0) p += ANOMALISTIC_MONTH
  return Math.round(385000 - 28500 * Math.cos((p / ANOMALISTIC_MONTH) * 2 * Math.PI))
}

/** The next instant at which the moon reaches `targetAge` days old. */
function nextPhase(from, targetAge) {
  const days = (from.getTime() - KNOWN_NEW_MOON) / 86400000
  let age = days % SYNODIC_MONTH
  if (age < 0) age += SYNODIC_MONTH
  let delta = (targetAge - age + SYNODIC_MONTH) % SYNODIC_MONTH
  if (delta < 0.01) delta += SYNODIC_MONTH
  return new Date(from.getTime() + delta * 86400000)
}

module.exports = {
  SYNODIC_MONTH,
  KNOWN_NEW_MOON,
  ANOMALISTIC_MONTH,
  KNOWN_PERIGEE,
  PHASE_NAMES,
  PHASE_EMOJIS,
  getMoonPhase,
  getMoonDistanceKm,
  nextPhase,
}
