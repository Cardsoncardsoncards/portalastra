// scripts/lint-copy.js
//
// Runs the shared output validator over hardcoded site and blog copy, so the
// same rule that gates AI-generated text also gates text a human typed. Doing
// this by hand does not scale across a 260KB posts file.
//
//   node scripts/lint-copy.js          report only
//   node scripts/lint-copy.js --fix    rewrite dashes in place, report the rest
//
// Banned words are reported, never auto-fixed: replacing one needs a human to
// choose a word that still means the right thing.

const fs = require('fs')
const path = require('path')

const { validateOutput } = require('../src/lib/shared')

const ROOT = path.join(__dirname, '..')

// Files whose string content reaches a reader.
const TARGETS = [
  'src/lib/posts.ts',
  'src/lib/shared/tarot.js',
  'src/lib/shared/numerology.js',
  'src/lib/utils.ts',
  'src/app/page.tsx',
  'src/app/about/page.tsx',
  'src/app/pricing/page.tsx',
  'src/app/moon/MoonClient.tsx',
  'src/app/calendars/CalendarsClient.tsx',
  'src/components/Footer.tsx',
  'src/app/layout.tsx',
  'src/app/privacy/page.tsx',
  'src/app/not-found.tsx',
  'src/app/nasa-data/page.tsx',
  'src/app/blog/BlogIndex.tsx',
  'src/app/blog/[slug]/page.tsx',
  'src/components/AmazonProductRow.tsx',
  'src/components/PremiumUnlock.tsx',
  'src/app/pricing/CheckoutClient.tsx',
  'src/app/api/ritual-prompt/route.ts',
  'src/app/api/horoscope/route.ts',
  'src/components/IntentionGuides.tsx',
  'src/components/PlantingCalendar.tsx',
  'scripts/generate-weekly-digest.js',
  'scripts/generate-monthly-forecast.js',
  'scripts/check-eclipse-alerts.js',
]

const fix = process.argv.includes('--fix')

// A dash reaches a reader in four forms in this codebase: the literal
// character, a — / – escape inside a JS string, and the &mdash; /
// &ndash; HTML entities in JSX. Checking only for the literal character misses
// three of the four, which is exactly what a by-hand pass would also miss.
const DASH_FORMS = /(\\u201[34]|&mdash;|&ndash;|[—–])/g

function hasDash(line) {
  DASH_FORMS.lastIndex = 0
  return DASH_FORMS.test(line)
}

// " — " becomes ", "; a bare one becomes a comma. Both read cleanly in the
// places these appear here.
function replaceDashes(text) {
  return text
    .replace(/\s+(?:\\u201[34]|&mdash;|&ndash;|[—–])\s+/g, ', ')
    .replace(/(?:\\u201[34]|&mdash;|&ndash;|[—–])/g, ',')
}

let totalDashLines = 0
let totalWordHits = 0
const wordReport = []

for (const relative of TARGETS) {
  const filePath = path.join(ROOT, relative)
  if (!fs.existsSync(filePath)) continue

  const original = fs.readFileSync(filePath, 'utf8')
  const lines = original.split('\n')

  let dashLines = 0
  lines.forEach((line, i) => {
    if (hasDash(line)) {
      dashLines++
      if (!fix) console.log(`${relative}:${i + 1}  dash  ${line.trim().slice(0, 110)}`)
    }

    // The shared style-rules constant has to name the banned words in order to
    // ban them. That one place carries an explicit marker rather than being
    // guessed at. `lint-copy-allow-next` suppresses the following line, so the
    // marker never has to sit inside a string that reaches a model or a reader.
    if (line.includes('lint-copy-allow')) return
    if (i > 0 && lines[i - 1].includes('lint-copy-allow-next')) return

    const result = validateOutput(line)
    for (const problem of result.problems) {
      if (!problem.startsWith('contains banned word')) continue
      totalWordHits++
      wordReport.push(`${relative}:${i + 1}  ${problem}  ${line.trim().slice(0, 110)}`)
    }
  })

  totalDashLines += dashLines

  if (fix && dashLines > 0) {
    fs.writeFileSync(filePath, replaceDashes(original), 'utf8')
    console.log(`[fixed] ${relative}: ${dashLines} line(s) with dashes`)
  }
}

if (wordReport.length) {
  console.log('\nBanned words (not auto-fixed, each needs a human decision):')
  for (const line of wordReport) console.log('  ' + line)
}

console.log(`\n${totalDashLines} line(s) with dashes, ${totalWordHits} banned-word hit(s).`)

if (!fix && (totalDashLines > 0 || totalWordHits > 0)) process.exitCode = 1
