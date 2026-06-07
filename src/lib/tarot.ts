// Full 78-card tarot deck with deterministic, date-seeded draws.
// Major Arcana carry bespoke meanings; Minor Arcana are composed from
// suit + rank keyword tables so every one of the 78 cards is distinct.

export type Suit = 'Major' | 'Wands' | 'Cups' | 'Swords' | 'Pentacles'

export interface TarotCard {
  name: string
  emoji: string
  arcana: Suit
  theme: string
  upright: string
  reversed: string
}

export interface DrawnCard extends TarotCard {
  orientation: 'Upright' | 'Reversed'
  meaning: string
}

const MAJORS: TarotCard[] = [
  { name: 'The Fool',          emoji: '🃏', arcana: 'Major', theme: 'New beginnings',      upright: 'A leap of faith, fresh starts, and innocent trust in the road ahead.', reversed: 'Recklessness, hesitation, or fear of stepping into the unknown.' },
  { name: 'The Magician',      emoji: '🪄', arcana: 'Major', theme: 'Manifestation',       upright: 'You hold every tool you need — focus your will and create.',           reversed: 'Scattered energy, untapped talent, or manipulation at play.' },
  { name: 'The High Priestess',emoji: '🌙', arcana: 'Major', theme: 'Intuition',           upright: 'Inner knowing speaks softly; trust the mystery you already sense.',     reversed: 'Secrets withheld, silenced intuition, surface over depth.' },
  { name: 'The Empress',       emoji: '👑', arcana: 'Major', theme: 'Abundance',           upright: 'Nurturing, fertility, and creative abundance flow toward you.',         reversed: 'Creative block, neglect, or smothering of what you tend.' },
  { name: 'The Emperor',       emoji: '🏛️', arcana: 'Major', theme: 'Structure',           upright: 'Authority, stability, and the discipline to build something lasting.',  reversed: 'Rigidity, control, or a structure that no longer serves.' },
  { name: 'The Hierophant',    emoji: '📜', arcana: 'Major', theme: 'Tradition',           upright: 'Guidance, shared belief, and wisdom passed down through ritual.',       reversed: 'Rebellion against dogma, or freedom from inherited rules.' },
  { name: 'The Lovers',        emoji: '💞', arcana: 'Major', theme: 'Union',               upright: 'Connection, alignment of values, and a meaningful choice of the heart.',reversed: 'Discord, misalignment, or a difficult choice avoided.' },
  { name: 'The Chariot',       emoji: '🛞', arcana: 'Major', theme: 'Willpower',           upright: 'Drive and determination carry you to victory — steer with focus.',     reversed: 'Loss of direction, opposing forces, or stalled momentum.' },
  { name: 'Strength',          emoji: '🦁', arcana: 'Major', theme: 'Courage',             upright: 'Gentle power, patience, and courage that tames the wildest fear.',      reversed: 'Self-doubt, raw emotion, or strength turned to force.' },
  { name: 'The Hermit',        emoji: '🕯️', arcana: 'Major', theme: 'Reflection',          upright: 'Solitude lights the way; seek the answer that lives within.',           reversed: 'Isolation, withdrawal, or refusing the wisdom of stillness.' },
  { name: 'Wheel of Fortune',  emoji: '🎡', arcana: 'Major', theme: 'Cycles',              upright: 'Fate turns in your favour — change, luck, and a new chapter open.',     reversed: 'Resistance to change, bad timing, or cycles repeating.' },
  { name: 'Justice',           emoji: '⚖️', arcana: 'Major', theme: 'Truth',               upright: 'Fairness, accountability, and cause meeting its honest effect.',        reversed: 'Imbalance, dishonesty, or consequences avoided.' },
  { name: 'The Hanged Man',    emoji: '🙃', arcana: 'Major', theme: 'Surrender',           upright: 'A pause and a new perspective; release the need to control.',           reversed: 'Stalling, martyrdom, or clinging when it is time to let go.' },
  { name: 'Death',             emoji: '💀', arcana: 'Major', theme: 'Transformation',      upright: 'An ending clears the ground for profound renewal.',                    reversed: 'Resistance to an ending, or change held at bay.' },
  { name: 'Temperance',        emoji: '🍷', arcana: 'Major', theme: 'Balance',             upright: 'Patience and moderation blend opposites into harmony.',                reversed: 'Excess, impatience, or elements out of proportion.' },
  { name: 'The Devil',         emoji: '😈', arcana: 'Major', theme: 'Attachment',          upright: 'Face what binds you — desire, habit, or fear holding you in place.',    reversed: 'Release from chains, reclaiming your own power.' },
  { name: 'The Tower',         emoji: '🗼', arcana: 'Major', theme: 'Upheaval',            upright: 'Sudden change shakes a false foundation so truth can stand.',           reversed: 'Averted disaster, or clinging to a crumbling structure.' },
  { name: 'The Star',          emoji: '⭐', arcana: 'Major', theme: 'Hope',                upright: 'Healing, renewal, and quiet faith after the storm.',                   reversed: 'Doubt, dimmed hope, or disconnection from your light.' },
  { name: 'The Moon',          emoji: '🌕', arcana: 'Major', theme: 'Mystery',             upright: 'Dreams, illusion, and intuition guiding you through the unknown.',      reversed: 'Confusion lifting, or fears finally brought to light.' },
  { name: 'The Sun',           emoji: '☀️', arcana: 'Major', theme: 'Joy',                 upright: 'Warmth, success, and radiant clarity — a wholehearted yes.',           reversed: 'Temporary clouds, dimmed optimism, or delayed joy.' },
  { name: 'Judgement',         emoji: '🎺', arcana: 'Major', theme: 'Awakening',           upright: 'A calling, reckoning, and rebirth into a truer self.',                 reversed: 'Self-doubt, avoidance, or a call left unanswered.' },
  { name: 'The World',         emoji: '🌍', arcana: 'Major', theme: 'Completion',          upright: 'Fulfilment, wholeness, and the joyful close of a great cycle.',        reversed: 'Loose ends, a goal nearly reached, or closure delayed.' },
]

const SUITS: { suit: Suit; emoji: string; theme: string }[] = [
  { suit: 'Wands',     emoji: '🔥', theme: 'energy, passion and ambition' },
  { suit: 'Cups',      emoji: '💧', theme: 'emotion, intuition and relationships' },
  { suit: 'Swords',    emoji: '⚔️', theme: 'intellect, truth and conflict' },
  { suit: 'Pentacles', emoji: '🪙', theme: 'work, money and the material world' },
]

const RANKS: { name: string; theme: string; up: string; rev: string }[] = [
  { name: 'Ace',    theme: 'New spark',     up: 'a pure new spark of',                 rev: 'a blocked or delayed beginning in' },
  { name: 'Two',    theme: 'Choice',        up: 'balance and a meaningful choice in',  rev: 'indecision and imbalance in' },
  { name: 'Three',  theme: 'Growth',        up: 'early growth and collaboration in',   rev: 'stalled progress or misalignment in' },
  { name: 'Four',   theme: 'Stability',     up: 'rest, structure and stability in',    rev: 'stagnation or clinging within' },
  { name: 'Five',   theme: 'Challenge',     up: 'conflict, loss or challenge in',      rev: 'recovery and release from struggle in' },
  { name: 'Six',    theme: 'Harmony',       up: 'harmony, generosity and progress in', rev: 'imbalance or stalled momentum in' },
  { name: 'Seven',  theme: 'Perseverance',  up: 'perseverance and assessment in',      rev: 'doubt or giving up too soon in' },
  { name: 'Eight',  theme: 'Movement',      up: 'swift movement and mastery in',       rev: 'delay, scattered focus or haste in' },
  { name: 'Nine',   theme: 'Resilience',    up: 'resilience and near-fulfilment in',   rev: 'anxiety or guardedness around' },
  { name: 'Ten',    theme: 'Completion',    up: 'completion and lasting legacy in',    rev: 'burden or an overdue ending in' },
  { name: 'Page',   theme: 'Curiosity',     up: 'curiosity and a fresh message about', rev: 'immaturity or blocked news about' },
  { name: 'Knight', theme: 'Action',        up: 'bold action and pursuit of',          rev: 'recklessness or stalled drive in' },
  { name: 'Queen',  theme: 'Mastery',       up: 'nurturing mastery and depth in',      rev: 'insecurity or imbalance in' },
  { name: 'King',   theme: 'Command',       up: 'authority and confident command of',  rev: 'control, coldness or misuse of' },
]

function buildMinors(): TarotCard[] {
  const cards: TarotCard[] = []
  for (const s of SUITS) {
    for (const r of RANKS) {
      cards.push({
        name: `${r.name} of ${s.suit}`,
        emoji: s.emoji,
        arcana: s.suit,
        theme: r.theme,
        upright: `${capitalize(r.up)} ${s.theme}.`,
        reversed: `${capitalize(r.rev)} ${s.theme}.`,
      })
    }
  }
  return cards
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const TAROT_DECK: TarotCard[] = [...MAJORS, ...buildMinors()] // 22 + 56 = 78

// --- deterministic seeding ---------------------------------------------------

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32 PRNG — stable across runs for a given seed
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function todayUTC(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function draw(card: TarotCard, reversed: boolean): DrawnCard {
  const orientation = reversed ? 'Reversed' : 'Upright'
  return { ...card, orientation, meaning: reversed ? card.reversed : card.upright }
}

// The whole world sees the same card for a given UTC date.
export function getDailyCard(dateStr: string = todayUTC()): DrawnCard {
  const r = rng(hashSeed('daily:' + dateStr))
  const index = Math.floor(r() * TAROT_DECK.length)
  const reversed = r() < 0.5
  return draw(TAROT_DECK[index], reversed)
}

function weekKey(dateStr: string): string {
  // ISO-ish week bucket: days since epoch / 7
  const [y, m, d] = dateStr.split('-').map(Number)
  const dayNum = Math.floor(Date.UTC(y, m - 1, d) / 86400000)
  return 'week:' + Math.floor(dayNum / 7)
}

export interface WeeklySpread {
  past: DrawnCard
  present: DrawnCard
  future: DrawnCard
}

// A fixed 3-card Past / Present / Future spread for the whole week.
export function getWeeklySpread(dateStr: string = todayUTC()): WeeklySpread {
  const r = rng(hashSeed(weekKey(dateStr)))
  const picked: DrawnCard[] = []
  const used = new Set<number>()
  while (picked.length < 3) {
    const index = Math.floor(r() * TAROT_DECK.length)
    if (used.has(index)) continue
    used.add(index)
    picked.push(draw(TAROT_DECK[index], r() < 0.5))
  }
  return { past: picked[0], present: picked[1], future: picked[2] }
}
