'use strict'

// Barrel for the shared logic module.
//
// Plain CommonJS on purpose: src/ imports it through webpack (`@/lib/shared`)
// and the scripts/ cron jobs require it directly (`require('../src/lib/shared')`),
// with no build step in between. Types for the TypeScript side live in
// index.d.ts alongside this file.

const time = require('./time.js')
const moon = require('./moon.js')
const numerology = require('./numerology.js')
const tarot = require('./tarot.js')
const donki = require('./donki.js')
const mailerlite = require('./mailerlite.js')
const astronomy = require('./astronomy.js')
const emailHtml = require('./emailHtml.js')
const outputGuard = require('./outputGuard.js')

module.exports = Object.assign(
  {},
  time,
  moon,
  numerology,
  tarot,
  donki,
  mailerlite,
  astronomy,
  emailHtml,
  outputGuard,
)
