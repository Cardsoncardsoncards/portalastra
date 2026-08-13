'use strict'

// Unit tests for src/lib/shared.
//
// Six of the original 65 audit findings traced back to this code: four
// disagreeing moon phase implementations, two disagreeing life path
// implementations, an angel number that lost its master-number guard in the
// email, and three hand-maintained copies of the tarot deck. This is the file
// that stops those coming back.
//
// Uses node:test, built into Node 20, so there is no test framework dependency
// to install or keep patched.

const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getMoonPhase,
  getMoonDistanceKm,
  nextPhase,
  PHASE_NAMES,
  SYNODIC_MONTH,
  getLifePath,
  getLifePathFromISO,
  reduceKeepMaster,
  getAngelNumber,
  LIFE_PATHS,
  ANGEL_NUMBER_MEANINGS,
  TAROT_DECK,
  getDailyCard,
  getWeeklySpread,
  getMonthlyCard,
  drawPersonal,
  flrIntensity,
  cmeIntensity,
  gstIntensity,
  classifyEvent,
  getTodayAEST,
  formatDate,
  ECLIPSES,
  validateOutput,
  validateFields,
  esc,
  escUrl,
  FREE_GROUP_ID,
  PAID_GROUP_ID,
} = require('../src/lib/shared')

const utc = (y, m, d, h = 0) => new Date(Date.UTC(y, m - 1, d, h))

// ─── Moon phase ──────────────────────────────────────────────────────────────

test('moon phase: the reference epoch is a New Moon', () => {
  // Jan 6 2000 18:14 UTC is the anchor the whole calculation hangs off.
  const phase = getMoonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)))
  assert.equal(phase.name, 'New Moon')
  assert.equal(phase.index, 0)
  assert.equal(phase.illumination, 0)
})

test('moon phase: half a synodic month later is a Full Moon', () => {
  const halfCycleMs = (SYNODIC_MONTH / 2) * 86400000
  const phase = getMoonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14) + halfCycleMs))
  assert.equal(phase.name, 'Full Moon')
  assert.equal(phase.index, 4)
  assert.equal(phase.illumination, 100)
})

test('moon phase: known real new moon, 12 August 2026', () => {
  // The August 2026 total solar eclipse is on the new moon of 12 Aug 2026,
  // which is an independent check on the epoch and cycle length.
  const phase = getMoonPhase(utc(2026, 8, 12, 18))
  assert.equal(phase.name, 'New Moon')
  assert.ok(phase.illumination <= 1, `expected ~0% illumination, got ${phase.illumination}`)
})

test('moon phase: known real full moon, 3 March 2026', () => {
  // The 3 March 2026 total lunar eclipse happens at a full moon.
  const phase = getMoonPhase(utc(2026, 3, 3, 12))
  assert.equal(phase.name, 'Full Moon')
  assert.ok(phase.illumination >= 99, `expected ~100% illumination, got ${phase.illumination}`)
})

test('moon phase: returns one of the eight named phases for any date', () => {
  for (let day = 0; day < 60; day++) {
    const phase = getMoonPhase(new Date(Date.UTC(2026, 0, 1) + day * 86400000))
    assert.ok(PHASE_NAMES.includes(phase.name), `unexpected phase name ${phase.name}`)
    assert.ok(phase.index >= 0 && phase.index < 8)
    assert.ok(phase.illumination >= 0 && phase.illumination <= 100)
    assert.ok(phase.age >= 0 && phase.age < SYNODIC_MONTH)
  }
})

test('moon phase: dates before the epoch do not produce a negative age', () => {
  const phase = getMoonPhase(utc(1969, 7, 20))
  assert.ok(phase.age >= 0, 'age must never be negative')
  assert.ok(PHASE_NAMES.includes(phase.name))
})

test('moon distance: tracks the anomalistic cycle, not the phase cycle', () => {
  // The promoted approximation spans 356,501 to 413,499 km. Real perigee and
  // apogee are 356,500 and 406,700, so perigee is essentially exact and apogee
  // overshoots by about 6,800 km. That overshoot is logged as DISC-003; this
  // envelope is the current function's, not reality's.
  const samples = []
  for (let day = 0; day < 28; day++) {
    const km = getMoonDistanceKm(new Date(Date.UTC(2026, 0, 1) + day * 86400000))
    assert.ok(km > 350000 && km < 415000, `implausible distance ${km} km`)
    samples.push(km)
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) > 40000, 'distance should vary across a cycle')

  // Two dates with the same illumination but different points in the perigee
  // cycle must give different distances. The old phase-based formula could not
  // do this, which is why it was wrong.
  const a = getMoonDistanceKm(utc(2026, 1, 15))
  const b = getMoonDistanceKm(new Date(Date.UTC(2026, 0, 15) + SYNODIC_MONTH * 86400000))
  assert.notEqual(a, b)
})

test('nextPhase: finds a strictly future occurrence', () => {
  const from = utc(2026, 8, 13)
  const nextNew = nextPhase(from, 0)
  const nextFull = nextPhase(from, SYNODIC_MONTH / 2)
  assert.ok(nextNew.getTime() > from.getTime())
  assert.ok(nextFull.getTime() > from.getTime())
  assert.ok((nextNew.getTime() - from.getTime()) / 86400000 <= SYNODIC_MONTH + 0.1)
  assert.equal(getMoonPhase(nextNew).name, 'New Moon')
  assert.equal(getMoonPhase(nextFull).name, 'Full Moon')
})

// ─── Life path ───────────────────────────────────────────────────────────────

test('life path: sums every digit of day+month+year', () => {
  // "531990" -> 5+3+1+9+9+0 = 27 -> 2+7 = 9
  assert.equal(getLifePath(5, 3, 1990), 9)
  // "111988" -> 1+1+1+9+8+8 = 28 -> 10 -> 1
  assert.equal(getLifePath(1, 1, 1988), 1)
  // "611950" -> 6+1+1+9+5+0 = 22, a master number, preserved as-is
  assert.equal(getLifePath(6, 1, 1950), 22)
  // "1941950" -> 1+9+4+1+9+5+0 = 29 -> 11, also preserved
  assert.equal(getLifePath(19, 4, 1950), 11)
  // "1981950" -> 1+9+8+1+9+5+0 = 33, preserved
  assert.equal(getLifePath(19, 8, 1950), 33)
})

test('life path: preserves the master numbers 11, 22 and 33', () => {
  assert.equal(reduceKeepMaster(11), 11)
  assert.equal(reduceKeepMaster(22), 22)
  assert.equal(reduceKeepMaster(33), 33)
  // 29 -> 11 and stops
  assert.equal(reduceKeepMaster(29), 11)
  // 39 -> 12 -> 3, no master number on the way
  assert.equal(reduceKeepMaster(39), 3)
})

test('life path: never returns a value outside the valid set', () => {
  const valid = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33])
  for (let year = 1920; year <= 2026; year += 7) {
    for (let month = 1; month <= 12; month++) {
      for (const day of [1, 9, 17, 28]) {
        const n = getLifePath(day, month, year)
        assert.ok(valid.has(n), `${day}/${month}/${year} produced ${n}`)
      }
    }
  }
})

test('life path: ISO form agrees with the component form', () => {
  // Leading zeros must not change the answer. This is the exact mismatch that
  // made the homepage and /calendars disagree.
  assert.equal(getLifePathFromISO('1990-03-05'), getLifePath(5, 3, 1990))
  assert.equal(getLifePathFromISO('1988-01-01'), getLifePath(1, 1, 1988))
  assert.equal(getLifePathFromISO('2000-12-31'), getLifePath(31, 12, 2000))
})

test('life path: every reachable number has a meaning entry', () => {
  const seen = new Set()
  for (let year = 1920; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      seen.add(getLifePath(15, month, year))
    }
  }
  for (const n of seen) {
    assert.ok(LIFE_PATHS[n], `LIFE_PATHS is missing an entry for ${n}`)
    assert.ok(LIFE_PATHS[n].name && LIFE_PATHS[n].desc)
  }
})

// ─── Angel number ────────────────────────────────────────────────────────────

test('angel number: keeps the master-number guard', () => {
  // The digest script used to reduce all the way to a single digit, so it
  // disagreed with the site on every 11/22/33 day. Find such a day and assert
  // it survives.
  let found = null
  for (let day = 0; day < 400 && !found; day++) {
    const d = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10)
    const n = getAngelNumber(d)
    if (n === 11 || n === 22 || n === 33) found = { d, n }
  }
  assert.ok(found, 'expected at least one master-number day in 2026')
  assert.ok([11, 22, 33].includes(found.n))
})

test('angel number: worked example', () => {
  // 2026-08-13 -> 13 + 8 + 2 + 0 + 2 + 6 = 31 -> 4
  assert.equal(getAngelNumber('2026-08-13'), 4)
})

test('angel number: always lands in the valid set and has a meaning', () => {
  const valid = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33])
  for (let day = 0; day < 366; day++) {
    const d = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10)
    const n = getAngelNumber(d)
    assert.ok(valid.has(n), `${d} produced ${n}`)
    assert.ok(ANGEL_NUMBER_MEANINGS[n], `no meaning for ${n}`)
  }
})

test('angel number: defaults to the AEST date', () => {
  assert.equal(getAngelNumber(), getAngelNumber(getTodayAEST()))
})

// ─── Tarot ───────────────────────────────────────────────────────────────────

test('tarot: the deck is exactly 78 distinct cards', () => {
  assert.equal(TAROT_DECK.length, 78)
  assert.equal(new Set(TAROT_DECK.map((c) => c.name)).size, 78)
  assert.equal(TAROT_DECK.filter((c) => c.arcana === 'Major').length, 22)
  assert.equal(TAROT_DECK.filter((c) => c.arcana !== 'Major').length, 56)
})

test('tarot: every card has complete meaning text', () => {
  for (const card of TAROT_DECK) {
    assert.ok(card.name && card.emoji && card.theme, `incomplete card: ${JSON.stringify(card)}`)
    assert.ok(card.upright && card.upright.length > 10, `weak upright for ${card.name}`)
    assert.ok(card.reversed && card.reversed.length > 10, `weak reversed for ${card.name}`)
  }
})

test('tarot: the daily draw is deterministic for a date', () => {
  const a = getDailyCard('2026-08-13')
  const b = getDailyCard('2026-08-13')
  assert.deepEqual(a, b)
  assert.ok(['Upright', 'Reversed'].includes(a.orientation))
  assert.equal(a.meaning, a.orientation === 'Reversed' ? a.reversed : a.upright)
})

test('tarot: different dates generally draw different cards', () => {
  const drawn = new Set()
  for (let day = 0; day < 60; day++) {
    const d = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10)
    drawn.add(getDailyCard(d).name)
  }
  assert.ok(drawn.size > 30, `only ${drawn.size} distinct cards across 60 days`)
})

test('tarot: the weekly spread is three distinct cards, stable within a week', () => {
  const spread = getWeeklySpread('2026-08-13')
  const names = [spread.past.name, spread.present.name, spread.future.name]
  assert.equal(new Set(names).size, 3, 'the three positions must be distinct cards')

  // The bucket must be Sunday-aligned, so it rolls over on the same day the
  // weekly digest is generated and sent. 2026-08-09 is a Sunday.
  const sunday = getWeeklySpread('2026-08-09')
  for (const day of ['2026-08-10', '2026-08-12', '2026-08-13', '2026-08-15']) {
    assert.deepEqual(getWeeklySpread(day), sunday, `${day} drifted from the week's spread`)
  }
  // ...and the next Sunday must start a new one.
  assert.notDeepEqual(getWeeklySpread('2026-08-16'), sunday)
})

test('tarot: week buckets roll over on Sunday, matching the digest send day', () => {
  // Regression guard for DISC-004. A plain floor(dayNum / 7) puts the boundary
  // on Thursday, so the email quoted a card the site stopped showing mid-week.
  for (let day = 0; day < 120; day++) {
    const date = new Date(Date.UTC(2026, 0, 1) + day * 86400000)
    const iso = date.toISOString().slice(0, 10)
    const previous = new Date(date.getTime() - 86400000).toISOString().slice(0, 10)
    const changed = JSON.stringify(getWeeklySpread(iso)) !== JSON.stringify(getWeeklySpread(previous))
    if (changed) {
      assert.equal(date.getUTCDay(), 0, `spread changed on ${iso}, which is not a Sunday`)
    }
  }
})

test('tarot: the monthly card is seeded on year AND month', () => {
  // The bug: indexing the deck by month number alone could only ever return
  // the first 12 Major Arcana, in the same order, every year.
  assert.deepEqual(getMonthlyCard(2026, 8), getMonthlyCard(2026, 8))
  assert.notDeepEqual(getMonthlyCard(2026, 8), getMonthlyCard(2027, 8))

  const drawn = new Set()
  for (let year = 2024; year <= 2033; year++) {
    for (let month = 1; month <= 12; month++) drawn.add(getMonthlyCard(year, month).name)
  }
  assert.ok(drawn.size > 40, `only ${drawn.size} distinct monthly cards across 10 years`)

  // And it must reach beyond the Major Arcana.
  const majors = new Set(TAROT_DECK.filter((c) => c.arcana === 'Major').map((c) => c.name))
  assert.ok([...drawn].some((n) => !majors.has(n)), 'monthly draw never leaves the Major Arcana')
})

test('tarot: the personal draw is three distinct, non-excluded cards', () => {
  const daily = getDailyCard('2026-08-13')
  const weekly = getWeeklySpread('2026-08-13')
  const exclude = new Set([daily.name, weekly.past.name, weekly.present.name, weekly.future.name])

  for (let i = 0; i < 50; i++) {
    const drawn = drawPersonal(exclude)
    assert.equal(drawn.length, 3)
    assert.equal(new Set(drawn.map((c) => c.name)).size, 3)
    for (const card of drawn) {
      assert.ok(!exclude.has(card.name), `${card.name} should have been excluded`)
      assert.equal(card.meaning, card.orientation === 'Reversed' ? card.reversed : card.upright)
    }
  }
})

// ─── DONKI classification ────────────────────────────────────────────────────

test('donki: flare class letters map to the right intensity', () => {
  assert.equal(flrIntensity('X2.1'), 'extreme')
  assert.equal(flrIntensity('M1.5'), 'high')
  assert.equal(flrIntensity('C3.0'), 'moderate')
  assert.equal(flrIntensity('B1.0'), 'low')
  assert.equal(flrIntensity(''), 'low')
  assert.equal(flrIntensity(undefined), 'low')
})

test('donki: CME speed and Kp index thresholds', () => {
  assert.equal(cmeIntensity(1600), 'high')
  assert.equal(cmeIntensity(1200), 'moderate')
  assert.equal(cmeIntensity(400), 'low')
  assert.equal(cmeIntensity(undefined), 'low')

  assert.equal(gstIntensity(9), 'extreme')
  assert.equal(gstIntensity(7), 'high')
  assert.equal(gstIntensity(5), 'moderate')
  assert.equal(gstIntensity(2), 'low')
})

test('donki: classifyEvent returns an intensity level, never a raw class string', () => {
  // This is the exact digest bug: `intensity` used to be "M1.5", which then
  // failed every label lookup.
  const levels = new Set(['low', 'moderate', 'high', 'extreme'])

  const flr = classifyEvent('FLR', { classType: 'M1.5' })
  assert.ok(levels.has(flr.intensity))
  assert.equal(flr.label, 'M1.5')

  const cme = classifyEvent('CME', { cmeAnalyses: [{ speed: 800 }, { speed: 1700, isMostAccurate: true }] })
  assert.equal(cme.intensity, 'high', 'should use the most accurate analysis')
  assert.equal(cme.label, '1700 km/s')

  const gst = classifyEvent('GST', { allKpIndex: [{ kpIndex: 3 }, { kpIndex: 8 }] })
  assert.equal(gst.intensity, 'high')
  assert.equal(gst.label, 'Kp 8')

  // Missing data must not throw.
  assert.ok(levels.has(classifyEvent('CME', {}).intensity))
  assert.ok(levels.has(classifyEvent('GST', {}).intensity))
  assert.ok(levels.has(classifyEvent('UNKNOWN', {}).intensity))
})

// ─── Dates ───────────────────────────────────────────────────────────────────

test('time: getTodayAEST returns a YYYY-MM-DD string', () => {
  assert.match(getTodayAEST(), /^\d{4}-\d{2}-\d{2}$/)
})

test('time: getTodayAEST is the Sydney date, not the UTC date', () => {
  // 2026-08-12 23:00 UTC is already 2026-08-13 in Sydney (UTC+10).
  assert.equal(getTodayAEST(new Date('2026-08-12T23:00:00Z')), '2026-08-13')
  assert.equal(getTodayAEST(new Date('2026-08-12T12:00:00Z')), '2026-08-12')
})

test('time: formatDate renders a short readable date', () => {
  assert.equal(formatDate('2026-08-13'), 'Aug 13, 2026')
  assert.equal(formatDate('2026-01-01'), 'Jan 1, 2026')
  assert.equal(formatDate(''), '')
})

// ─── Astronomy table ─────────────────────────────────────────────────────────

test('astronomy: the eclipse table holds the four verified 2026 dates', () => {
  const byDate = Object.fromEntries(ECLIPSES.map((e) => [e.date, e.label]))
  assert.equal(byDate['2026-02-17'], 'Annular Solar Eclipse')
  assert.equal(byDate['2026-03-03'], 'Total Lunar Eclipse')
  assert.equal(byDate['2026-08-12'], 'Total Solar Eclipse')
  assert.equal(byDate['2026-08-28'], 'Partial Lunar Eclipse')

  // The wrong February date must never come back.
  assert.ok(!byDate['2026-02-06'], '2026-02-06 was the wrong annular eclipse date')
  // The unverified 2027 entry must not be in the live table.
  assert.ok(!byDate['2027-08-02'], '2027-08-02 is unverified and must stay out')
})

test('astronomy: every eclipse entry is well formed', () => {
  for (const e of ECLIPSES) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(e.label && e.label.length > 3)
    assert.ok(['solar-eclipse', 'lunar-eclipse'].includes(e.kind))
    // A lunar eclipse must fall on a full moon, a solar eclipse on a new moon.
    const phase = getMoonPhase(new Date(e.date + 'T12:00:00Z'))
    const expected = e.kind === 'lunar-eclipse' ? 'Full Moon' : 'New Moon'
    assert.equal(phase.name, expected, `${e.date} ${e.label} is not on a ${expected}`)
  }
})

// ─── Output validator ────────────────────────────────────────────────────────

test('validator: rejects em dashes and en dashes', () => {
  assert.equal(validateOutput('This is fine. Really.').ok, true)
  assert.equal(validateOutput('This is not fine — it has an em dash.').ok, false)
  assert.equal(validateOutput('Nor is this – an en dash.').ok, false)
  // A plain hyphen is fine.
  assert.equal(validateOutput('A well-considered sentence.').ok, true)
})

test('validator: rejects the banned words', () => {
  for (const word of ['eternal', 'forever', 'infinite', 'tapestry', 'dance']) {
    assert.equal(validateOutput(`The sky is ${word} tonight.`).ok, false, `"${word}" should be rejected`)
  }
  // Case insensitive, and inflections too.
  assert.equal(validateOutput('Forever and always.').ok, false)
  assert.equal(validateOutput('The stars danced.').ok, false)
})

test('validator: word boundaries, so ordinary words are not false positives', () => {
  // This is the whole reason the matching is anchored.
  for (const phrase of [
    'Trust your guidance today.',
    'Avoidance is not the answer.',
    'A season of abundance.',
    'Maternal instincts run deep.',
    'Redance is not a word but abundances is.',
  ]) {
    assert.equal(validateOutput(phrase).ok, true, `false positive on: ${phrase}`)
  }
})

test('validator: empty output is a failure', () => {
  assert.equal(validateOutput('').ok, false)
  assert.equal(validateOutput('   ').ok, false)
  assert.equal(validateOutput(null).ok, false)
})

test('validator: validateFields names the offending field', () => {
  const result = validateFields({ subject: 'Fine.', body: 'Broken — here.' })
  assert.equal(result.ok, false)
  assert.ok(result.problems.some((p) => p.startsWith('body:')), result.problems.join('; '))
  assert.ok(!result.problems.some((p) => p.startsWith('subject:')))

  // Undefined fields are skipped, not failed.
  assert.equal(validateFields({ subject: 'Fine.', missing: undefined }).ok, true)
})

// ─── HTML escaping ───────────────────────────────────────────────────────────

test('esc: escapes every character that matters in HTML', () => {
  assert.equal(esc('<script>'), '&lt;script&gt;')
  assert.equal(esc('a & b'), 'a &amp; b')
  assert.equal(esc('say "hi"'), 'say &quot;hi&quot;')
  assert.equal(esc("it's"), 'it&#39;s')
  assert.equal(esc(null), '')
  assert.equal(esc(undefined), '')
  assert.equal(esc(11), '11')
})

test('esc: output is safe inside a quoted attribute', () => {
  // The APOD title lands in alt="...". A quote in the title must not close it.
  const attack = 'Nebula" onerror="alert(1)'
  const escaped = esc(attack)
  assert.ok(!escaped.includes('"'), 'a raw double quote survived escaping')
})

test('escUrl: only permits http and https', () => {
  assert.equal(escUrl('https://apod.nasa.gov/image.jpg'), 'https://apod.nasa.gov/image.jpg')
  assert.equal(escUrl('//cdn.example.com/x.png'), '//cdn.example.com/x.png')
  assert.equal(escUrl('javascript:alert(1)'), '')
  assert.equal(escUrl('data:text/html,<script>'), '')
  assert.equal(escUrl(''), '')
  assert.equal(escUrl(undefined), '')
})

// ─── Constants ───────────────────────────────────────────────────────────────

test('mailerlite: the two group ids are present and distinct', () => {
  assert.match(FREE_GROUP_ID, /^\d+$/)
  assert.match(PAID_GROUP_ID, /^\d+$/)
  assert.notEqual(FREE_GROUP_ID, PAID_GROUP_ID)
})
