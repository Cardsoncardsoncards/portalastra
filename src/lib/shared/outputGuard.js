'use strict'

// House-style validator for AI-generated text.
//
// The style rules are stated in every generation prompt, but a prompt is a
// request, not a guarantee. This is the check that runs on the output before a
// visitor or a subscriber ever sees it. It lives in the shared module so the
// five AI generation surfaces (the two web routes and the three email scripts)
// all enforce exactly the same rule set.
//
// The banned-word matching is word-boundary anchored on purpose. A naive
// substring match for "dance" flags "guidance", "avoidance" and "abundance",
// all ordinary words in this copy; "eternal" flags "maternal"; "infinite"
// flags nothing useful but the principle is the same.

/** Em dash and en dash. Both banned in Portal Astra copy. */
const DASH_RE = /[—–]/

const BANNED_WORDS = ['eternal', 'forever', 'infinite', 'tapestry', 'dance']

/**
 * The house style rules, phrased for a generation prompt.
 *
 * Every AI surface interpolates this rather than restating the list, so the
 * rules a model is told and the rules the validator enforces are the same
 * strings. It is also the only place in the codebase that has to spell the
 * banned words out, which keeps scripts/lint-copy.js honest everywhere else.
 */
const STYLE_RULES_PROMPT = [
  '- No em dashes or en dashes anywhere. Use a full stop, a comma, or restructure the sentence.',
  `- Never use these words: ${BANNED_WORDS.join(', ')}.`,
  '- Keep sentences under 25 words.',
  '- Mystical but grounded, scientific but accessible. Never cheesy.',
].join('\n')

// \b anchors to word boundaries; the optional suffix group allows ordinary
// inflections of the banned word itself (dances, dancing, infinitely) without
// matching unrelated words that merely contain the letters.
function bannedWordRe(word) {
  return new RegExp(`\\b${word}(s|d|ly|ing)?\\b`, 'i')
}

/**
 * Check one piece of generated text.
 * Returns every problem found, so a log line says what was wrong.
 */
function validateOutput(text) {
  const problems = []

  if (!text || !String(text).trim()) {
    return { ok: false, problems: ['empty output'] }
  }

  const value = String(text)

  if (DASH_RE.test(value)) {
    problems.push('contains an em dash or en dash')
  }

  for (const word of BANNED_WORDS) {
    if (bannedWordRe(word).test(value)) {
      problems.push(`contains banned word "${word}"`)
    }
  }

  return { ok: problems.length === 0, problems }
}

/** Validate several named fields at once, naming which field failed. */
function validateFields(fields) {
  const problems = []
  for (const name of Object.keys(fields)) {
    const value = fields[name]
    if (value === undefined || value === null) continue
    const result = validateOutput(value)
    if (!result.ok) {
      for (const problem of result.problems) problems.push(`${name}: ${problem}`)
    }
  }
  return { ok: problems.length === 0, problems }
}

module.exports = {
  DASH_RE,
  BANNED_WORDS,
  STYLE_RULES_PROMPT,
  validateOutput,
  validateFields,
}
