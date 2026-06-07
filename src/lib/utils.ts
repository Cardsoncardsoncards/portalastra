export function getMoonPhase() {
  const known = new Date('2000-01-06')
  const diff = (Date.now() - known.getTime()) / 86400000
  const cycle = diff % 29.53

  if (cycle < 1.85) return { name: 'New Moon', emoji: '🌑', illumination: 0 }
  if (cycle < 7.38) return { name: 'Waxing Crescent', emoji: '🌒', illumination: 25 }
  if (cycle < 9.22) return { name: 'First Quarter', emoji: '🌓', illumination: 50 }
  if (cycle < 14.77) return { name: 'Waxing Gibbous', emoji: '🌔', illumination: 75 }
  if (cycle < 16.61) return { name: 'Full Moon', emoji: '🌕', illumination: 100 }
  if (cycle < 22.15) return { name: 'Waning Gibbous', emoji: '🌖', illumination: 75 }
  if (cycle < 23.99) return { name: 'Last Quarter', emoji: '🌗', illumination: 50 }
  return { name: 'Waning Crescent', emoji: '🌘', illumination: 25 }
}

export function getAngelNumber(date?: Date) {
  const d = date || new Date()
  const digits = [
    d.getDate(),
    d.getMonth() + 1,
    ...d.getFullYear().toString().split('').map(Number),
  ]
  let sum = digits.reduce((a, b) => a + b, 0)
  // Reduce to a single digit, but stop on the master numbers 11, 22, 33.
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0)
  }
  return sum
}

export const ANGEL_NUMBER_MEANINGS: Record<number, { theme: string; message: string }> = {
  1: { theme: 'New beginnings', message: 'The universe signals a fresh start. Trust the path opening before you.' },
  2: { theme: 'Balance and harmony', message: 'Duality holds wisdom. Both the stars and your soul seek equilibrium.' },
  3: { theme: 'Creativity and growth', message: 'Creative energy surges through the cosmos. Express without fear.' },
  4: { theme: 'Stability and foundation', message: 'Build on solid ground today. The planets support steady effort.' },
  5: { theme: 'Change and freedom', message: 'Transformation is in the air. Like celestial bodies in motion, embrace the shift.' },
  6: { theme: 'Nurturing and care', message: 'Love flows through the cosmos today. Tend to what you cherish.' },
  7: { theme: 'Wisdom and intuition', message: 'The universe speaks in symbols. Listen to what the sky is telling you.' },
  8: { theme: 'Abundance and power', message: 'Cycles of prosperity align. The infinite loop of the cosmos turns in your favour.' },
  9: { theme: 'Completion and release', message: 'A chapter closes as another prepares to open. Release with gratitude.' },
  11: { theme: 'Intuition and enlightenment', message: 'A master number. Heightened intuition lights your way — trust the inner spark of insight.' },
  22: { theme: 'Master builder, turning dreams to reality', message: 'A master number. The power to turn grand visions into solid form is within your reach today.' },
  33: { theme: 'Master teacher, compassion and guidance', message: 'A master number. Lead with compassion; your guidance uplifts everyone around you.' },
}

export function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m - 1]} ${+d}, ${y}`
}

export function getTodayUTC() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const SIGNS = [
  { name: 'Aries',       emoji: '♈', dates: 'Mar 21 – Apr 19', element: 'Fire',  ruling: 'Mars'    },
  { name: 'Taurus',      emoji: '♉', dates: 'Apr 20 – May 20', element: 'Earth', ruling: 'Venus'   },
  { name: 'Gemini',      emoji: '♊', dates: 'May 21 – Jun 20', element: 'Air',   ruling: 'Mercury' },
  { name: 'Cancer',      emoji: '♋', dates: 'Jun 21 – Jul 22', element: 'Water', ruling: 'Moon'    },
  { name: 'Leo',         emoji: '♌', dates: 'Jul 23 – Aug 22', element: 'Fire',  ruling: 'Sun'     },
  { name: 'Virgo',       emoji: '♍', dates: 'Aug 23 – Sep 22', element: 'Earth', ruling: 'Mercury' },
  { name: 'Libra',       emoji: '♎', dates: 'Sep 23 – Oct 22', element: 'Air',   ruling: 'Venus'   },
  { name: 'Scorpio',     emoji: '♏', dates: 'Oct 23 – Nov 21', element: 'Water', ruling: 'Pluto'   },
  { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 – Dec 21', element: 'Fire',  ruling: 'Jupiter' },
  { name: 'Capricorn',   emoji: '♑', dates: 'Dec 22 – Jan 19', element: 'Earth', ruling: 'Saturn'  },
  { name: 'Aquarius',    emoji: '♒', dates: 'Jan 20 – Feb 18', element: 'Air',   ruling: 'Uranus'  },
  { name: 'Pisces',      emoji: '♓', dates: 'Feb 19 – Mar 20', element: 'Water', ruling: 'Neptune' },
]
