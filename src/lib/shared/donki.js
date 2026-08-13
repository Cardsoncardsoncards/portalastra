'use strict'

// DONKI space-weather classification, shared by /api/donki and the weekly
// digest script.
//
// The digest used to treat NASA's raw `classType` string ("M1.5", "X2.0") as
// if it were already an intensity level and look it up in the label table,
// which never matched, so every event silently fell through to the raw class
// string. These are the classifiers /api/donki was already getting right.

const EVENT_TYPE_NAMES = {
  CME: 'Coronal Mass Ejection',
  FLR: 'Solar Flare',
  GST: 'Geomagnetic Storm',
  IPS: 'Interplanetary Shockwave',
  MPC: 'Magnetopause Crossing',
  RBE: 'Radiation Belt Enhancement',
  HSS: 'High-Speed Solar Wind',
  SEP: 'Solar Energetic Particles',
  WSA: 'Solar Wind Event',
}

const INTENSITY_LABELS = {
  low: 'mild, no significant impact on daily life',
  moderate: 'moderate, minor satellite and radio effects possible',
  high: 'strong, auroras may be visible at higher latitudes',
  extreme: 'severe, potential disruptions to GPS and power grids',
}

/** Solar flare class letter -> intensity. X > M > C > everything else. */
function flrIntensity(classType) {
  const letter = String(classType || '').charAt(0).toUpperCase()
  if (letter === 'X') return 'extreme'
  if (letter === 'M') return 'high'
  if (letter === 'C') return 'moderate'
  return 'low'
}

/** CME shock speed in km/s -> intensity. */
function cmeIntensity(speed) {
  if (!speed) return 'low'
  if (speed > 1500) return 'high'
  if (speed > 1000) return 'moderate'
  return 'low'
}

/** Geomagnetic storm peak Kp index -> intensity. */
function gstIntensity(maxKp) {
  if (maxKp >= 9) return 'extreme'
  if (maxKp >= 7) return 'high'
  if (maxKp >= 5) return 'moderate'
  return 'low'
}

/**
 * Classify a raw DONKI entry of a known type. Returns the intensity level and
 * the human-readable class string used in the UI and the emails.
 */
function classifyEvent(type, entry) {
  if (type === 'FLR') {
    return { intensity: flrIntensity(entry.classType), label: entry.classType || '—' }
  }
  if (type === 'CME') {
    const analyses = entry.cmeAnalyses || []
    const best = analyses.find((a) => a.isMostAccurate) || analyses[0]
    const speed = best && best.speed
    return {
      intensity: cmeIntensity(speed),
      label: speed ? `${Math.round(speed)} km/s` : '—',
    }
  }
  if (type === 'GST') {
    const kps = (entry.allKpIndex || []).map((k) => k.kpIndex)
    const maxKp = kps.length ? Math.max.apply(null, kps) : 0
    return { intensity: gstIntensity(maxKp), label: maxKp > 0 ? `Kp ${maxKp}` : '—' }
  }
  return { intensity: 'low', label: '—' }
}

module.exports = {
  EVENT_TYPE_NAMES,
  INTENSITY_LABELS,
  flrIntensity,
  cmeIntensity,
  gstIntensity,
  classifyEvent,
}
