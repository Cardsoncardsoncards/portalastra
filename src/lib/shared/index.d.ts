// Type surface for the shared CommonJS logic module (index.js).
// Keep in sync by hand; the runtime source of truth is the .js files.

// --- time --------------------------------------------------------------------

export declare const SITE_TIME_ZONE: string
export declare function getTodayAEST(date?: Date): string
export declare function formatDateLongAEST(date?: Date): string
export declare function formatDate(dateStr: string): string
export declare function formatISOLong(dateStr: string): string

// --- moon --------------------------------------------------------------------

export interface MoonPhase {
  name: string
  emoji: string
  index: number
  illumination: number
  age: number
  frac: number
}

export declare const SYNODIC_MONTH: number
export declare const KNOWN_NEW_MOON: number
export declare const ANOMALISTIC_MONTH: number
export declare const KNOWN_PERIGEE: number
export declare const PHASE_NAMES: string[]
export declare const PHASE_EMOJIS: string[]
export declare function getMoonPhase(date?: Date): MoonPhase
export declare function getMoonDistanceKm(date?: Date): number
export declare function nextPhase(from: Date, targetAge: number): Date

// --- numerology --------------------------------------------------------------

export interface AngelNumberMeaning {
  theme: string
  message: string
}

export interface LifePathInfo {
  name: string
  desc: string
  compat: number[]
  famous: string
}

export declare function reduceKeepMaster(n: number): number
export declare function getLifePath(day: number, month: number, year: number): number
export declare function getLifePathFromISO(dateStr: string): number | null
export declare function getAngelNumber(dateStr?: string): number
export declare const ANGEL_NUMBER_MEANINGS: Record<number, AngelNumberMeaning>
export declare const LIFE_PATHS: Record<number, LifePathInfo>

// --- tarot -------------------------------------------------------------------

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

export interface WeeklySpread {
  past: DrawnCard
  present: DrawnCard
  future: DrawnCard
}

export declare const TAROT_DECK: TarotCard[]
export declare function getDailyCard(dateStr: string): DrawnCard
export declare function getWeeklySpread(dateStr: string): WeeklySpread
export declare function getMonthlyCard(year: number, month: number): DrawnCard
export declare function drawPersonal(exclude?: Set<string>): DrawnCard[]
export declare function cardKeywords(card: TarotCard): string

// --- donki -------------------------------------------------------------------

export type Intensity = 'extreme' | 'high' | 'moderate' | 'low'

export declare const EVENT_TYPE_NAMES: Record<string, string>
export declare const INTENSITY_LABELS: Record<string, string>
export declare function flrIntensity(classType: string): Intensity
export declare function cmeIntensity(speed?: number): Intensity
export declare function gstIntensity(maxKp: number): Intensity
export declare function classifyEvent(
  type: string,
  entry: Record<string, any>,
): { intensity: Intensity; label: string }

// --- mailerlite --------------------------------------------------------------

export declare const FREE_GROUP_ID: string
export declare const PAID_GROUP_ID: string

// --- astronomy ---------------------------------------------------------------

export interface SkyEvent {
  date: string
  label: string
  kind: 'solar-eclipse' | 'lunar-eclipse'
}

export interface RetrogradeWindow {
  start: string
  end: string
  sign: string
}

export declare const ECLIPSES: SkyEvent[]
export declare const UNVERIFIED_ECLIPSES: SkyEvent[]
export declare const MERCURY_RETROGRADE_2026: RetrogradeWindow[]
export declare function upcomingEclipses(todayISO: string): SkyEvent[]

// --- email html --------------------------------------------------------------

export declare function esc(value: unknown): string
export declare function escUrl(value: unknown): string
export declare const ENTERTAINMENT_DISCLAIMER: string
export declare function emailFooterHTML(): string

// --- output guard ------------------------------------------------------------

export interface ValidationResult {
  ok: boolean
  problems: string[]
}

export declare const DASH_RE: RegExp
export declare const BANNED_WORDS: string[]
export declare const STYLE_RULES_PROMPT: string
export declare function validateOutput(text: string): ValidationResult
export declare function validateFields(fields: Record<string, string | undefined | null>): ValidationResult
