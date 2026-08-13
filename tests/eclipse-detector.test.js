'use strict'

// Regression tests for the eclipse/supermoon alert detector.
//
// Two bugs are pinned here:
//
//  1. The old seasonal "±18 days from a mean node crossing" model, which had
//     the February 2026 eclipse on the wrong day and missed both 2026 lunar
//     eclipses entirely.
//  2. The de-duplication hole: a ±1-day send window plus a state file that
//     lived in a gitignored path in a fresh CI checkout, so any detected event
//     would have sent on three consecutive days.
//
// The script exports its detection functions and only runs main() under
// `require.main === module`, so none of this makes a network call.

const test = require('node:test')
const assert = require('node:assert/strict')

const { detectEvents, eventsDueOn, daysUntil, LEAD_DAYS } = require('../scripts/check-eclipse-alerts.js')
const { ECLIPSES } = require('../src/lib/shared')

const DAY = 86400000
const at = (iso, hour = 9) =>
  Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), hour)

test('lead time is exactly seven days', () => {
  assert.equal(LEAD_DAYS, 7)
})

test('daysUntil counts whole UTC days regardless of run hour', () => {
  for (let hour = 0; hour < 24; hour++) {
    assert.equal(daysUntil('2026-08-28', at('2026-08-21', hour)), 7, `hour ${hour} disagreed`)
  }
  assert.equal(daysUntil('2026-08-28', at('2026-08-28')), 0)
  assert.equal(daysUntil('2026-08-28', at('2026-08-29')), -1)
})

test('every verified eclipse fires exactly once, seven days ahead', () => {
  for (const eclipse of ECLIPSES) {
    const firedOn = []
    // Sweep every daily 09:00 UTC run from 40 days before to 5 days after.
    for (let offset = -40; offset <= 5; offset++) {
      const now = at(eclipse.date) + offset * DAY
      if (eventsDueOn(now).some((e) => e.dateISO === eclipse.date)) {
        firedOn.push(new Date(now).toISOString().slice(0, 10))
      }
    }

    assert.equal(
      firedOn.length,
      1,
      `${eclipse.date} ${eclipse.label} fired ${firedOn.length} times: ${firedOn.join(', ')}`,
    )
    assert.equal(daysUntil(eclipse.date, at(firedOn[0])), LEAD_DAYS)
  }
})

test('a delayed run on the correct day still fires, and adjacent days do not', () => {
  const target = '2026-08-28'
  const runDay = at('2026-08-21', 0)

  for (let hour = 0; hour < 24; hour++) {
    const due = eventsDueOn(runDay + hour * 3600000).filter((e) => e.dateISO === target)
    assert.equal(due.length, 1, `hour ${hour} did not fire exactly once`)
  }

  for (const dayOffset of [-2, -1, 1, 2]) {
    for (const hour of [0, 6, 12, 18, 23]) {
      const due = eventsDueOn(runDay + dayOffset * DAY + hour * 3600000).filter((e) => e.dateISO === target)
      assert.equal(due.length, 0, `day ${dayOffset} hour ${hour} fired when it should not`)
    }
  }
})

test('a full year of daily runs produces no duplicate sends', () => {
  const sends = []
  for (let day = 0; day < 365; day++) {
    const now = Date.UTC(2026, 0, 1) + day * DAY + 9 * 3600000
    for (const event of eventsDueOn(now)) sends.push(`${event.name}|${event.dateISO}`)
  }
  assert.equal(new Set(sends).size, sends.length, `duplicate sends: ${sends.join(', ')}`)
  assert.ok(sends.length >= ECLIPSES.length, 'every 2026 eclipse should be alerted on')
})

test('detected events carry everything the email template needs', () => {
  const events = detectEvents(at('2026-08-01'))
  assert.ok(events.length > 0)
  for (const event of events) {
    assert.ok(event.name)
    assert.match(event.dateISO, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(event.dateLabel && event.dateLabel.length > 8)
    assert.ok(['solar-eclipse', 'lunar-eclipse', 'supermoon'].includes(event.kind))
  }
})

test('detection looks 60 days ahead and no further', () => {
  // Nothing more than 60 days out, nothing already past.
  const now = at('2026-06-01')
  for (const event of detectEvents(now)) {
    const days = daysUntil(event.dateISO, now)
    assert.ok(days >= 0 && days <= 60, `${event.dateISO} is ${days} days away`)
  }
})

test('a listed lunar eclipse is not also announced as a supermoon', () => {
  const eclipseDates = new Set(ECLIPSES.map((e) => e.date))
  for (let day = 0; day < 365; day++) {
    const events = detectEvents(Date.UTC(2026, 0, 1) + day * DAY)
    for (const event of events) {
      if (event.kind !== 'supermoon') continue
      assert.ok(!eclipseDates.has(event.dateISO), `${event.dateISO} announced twice`)
    }
  }
})
