'use strict'

const { getTodayAEST } = require('./time.js')

// Single source of truth for numerology.
//
// The life path implementation promoted here is the CalendarsClient one: sum
// every digit of the birth date written out as day+month+year, then reduce
// while preserving the master numbers. That is the method the site's own
// published blog post describes, so it is the one that ships. The homepage
// previously reduced each component separately first, which produces a
// different answer for many dates.

/** Reduce to a single digit, stopping on the master numbers 11, 22 and 33. */
function reduceKeepMaster(n) {
  let value = n
  while (value > 9 && value !== 11 && value !== 22 && value !== 33) {
    value = String(value).split('').reduce((a, b) => a + Number(b), 0)
  }
  return value
}

/** Life path from numeric day / month / year components. */
function getLifePath(day, month, year) {
  const digits = `${day}${month}${year}`
  const sum = digits.split('').reduce((a, b) => a + Number(b), 0)
  return reduceKeepMaster(sum)
}

/** Life path from a `YYYY-MM-DD` string (leading zeros are dropped first). */
function getLifePathFromISO(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  if (!y || !m || !d) return null
  return getLifePath(d, m, y)
}

/**
 * The day's angel number: day + month + every digit of the year, reduced,
 * preserving the master numbers 11, 22 and 33.
 *
 * The master-number guard is the whole point. The copy previously inlined in
 * scripts/generate-weekly-digest.js reduced all the way to a single digit, so
 * the email and the site disagreed on every 11/22/33 day.
 */
function getAngelNumber(dateStr) {
  const iso = dateStr || getTodayAEST()
  const [y, m, d] = String(iso).split('-').map(Number)
  const digits = [d, m].concat(String(y).split('').map(Number))
  const sum = digits.reduce((a, b) => a + b, 0)
  return reduceKeepMaster(sum)
}

const ANGEL_NUMBER_MEANINGS = {
  1: { theme: 'New beginnings', message: 'The universe signals a fresh start. Trust the path opening before you.' },
  2: { theme: 'Balance and harmony', message: 'Duality holds wisdom. Both the stars and your soul seek equilibrium.' },
  3: { theme: 'Creativity and growth', message: 'Creative energy surges through the cosmos. Express without fear.' },
  4: { theme: 'Stability and foundation', message: 'Build on solid ground today. The planets support steady effort.' },
  5: { theme: 'Change and freedom', message: 'Transformation is in the air. Like celestial bodies in motion, embrace the shift.' },
  6: { theme: 'Nurturing and care', message: 'Love flows through the cosmos today. Tend to what you cherish.' },
  7: { theme: 'Wisdom and intuition', message: 'The universe speaks in symbols. Listen to what the sky is telling you.' },
  8: { theme: 'Abundance and power', message: 'Cycles of prosperity align. The turning wheel of the cosmos moves in your favour.' },
  9: { theme: 'Completion and release', message: 'A chapter closes as another prepares to open. Release with gratitude.' },
  11: { theme: 'Intuition and enlightenment', message: 'A master number. Heightened intuition lights your way. Trust the inner spark of insight.' },
  22: { theme: 'Master builder, turning dreams to reality', message: 'A master number. The power to turn grand visions into solid form is within your reach today.' },
  33: { theme: 'Master teacher, compassion and guidance', message: 'A master number. Lead with compassion; your guidance uplifts everyone around you.' },
}

// The single life-path meaning table. Both the homepage calculator and the
// /calendars birth tab read from this; the homepage previously borrowed
// ANGEL_NUMBER_MEANINGS, so the same number described two different things.
const LIFE_PATHS = {
  1: { name: 'The Leader', desc: 'Independent, pioneering, driven. You forge your own path.', compat: [3, 5, 9], famous: 'Steve Jobs' },
  2: { name: 'The Mediator', desc: 'Diplomatic, sensitive, cooperative. You bring harmony.', compat: [6, 8, 9], famous: 'Barack Obama' },
  3: { name: 'The Creator', desc: 'Expressive, joyful, imaginative. You inspire others.', compat: [1, 5, 9], famous: 'David Bowie' },
  4: { name: 'The Builder', desc: 'Disciplined, practical, reliable. You create foundations.', compat: [2, 7, 8], famous: 'Oprah Winfrey' },
  5: { name: 'The Adventurer', desc: 'Free-spirited, curious, adaptable. You embrace change.', compat: [1, 3, 7], famous: 'Angelina Jolie' },
  6: { name: 'The Nurturer', desc: 'Caring, responsible, loving. You support those around you.', compat: [2, 3, 9], famous: 'John Lennon' },
  7: { name: 'The Seeker', desc: 'Analytical, spiritual, introspective. You search for truth.', compat: [4, 5, 7], famous: 'Princess Diana' },
  8: { name: 'The Achiever', desc: 'Ambitious, authoritative, successful. You manifest abundance.', compat: [2, 4, 6], famous: 'Pablo Picasso' },
  9: { name: 'The Humanitarian', desc: 'Compassionate, wise, generous. You serve the greater good.', compat: [1, 3, 6], famous: 'Mahatma Gandhi' },
  11: { name: 'The Visionary (Master Number)', desc: 'Intuitive, inspiring, enlightened. You are here to illuminate.', compat: [2, 11, 22], famous: 'Prince William' },
  22: { name: 'The Master Builder (Master Number)', desc: 'Powerful, visionary, capable. You turn dreams into reality.', compat: [4, 11, 22], famous: 'Bill Gates' },
  33: { name: 'The Master Teacher (Master Number)', desc: 'Compassionate, selfless, devoted. You uplift all of humanity.', compat: [6, 11, 33], famous: 'Stephen King' },
}

module.exports = {
  reduceKeepMaster,
  getLifePath,
  getLifePathFromISO,
  getAngelNumber,
  ANGEL_NUMBER_MEANINGS,
  LIFE_PATHS,
}
