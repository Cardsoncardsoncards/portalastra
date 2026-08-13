// Site constants that are not part of the shared cross-runtime logic module.
//
// Moon phase, angel number, life path, tarot and date formatting all moved to
// `@/lib/shared` (src/lib/shared/*.js) so that src/ and scripts/ run the exact
// same implementations. Nothing should reintroduce a local copy here.

export const SIGNS = [
  { name: 'Aries',       emoji: '♈', dates: 'Mar 21 to Apr 19', element: 'Fire',  ruling: 'Mars'    },
  { name: 'Taurus',      emoji: '♉', dates: 'Apr 20 to May 20', element: 'Earth', ruling: 'Venus'   },
  { name: 'Gemini',      emoji: '♊', dates: 'May 21 to Jun 20', element: 'Air',   ruling: 'Mercury' },
  { name: 'Cancer',      emoji: '♋', dates: 'Jun 21 to Jul 22', element: 'Water', ruling: 'Moon'    },
  { name: 'Leo',         emoji: '♌', dates: 'Jul 23 to Aug 22', element: 'Fire',  ruling: 'Sun'     },
  { name: 'Virgo',       emoji: '♍', dates: 'Aug 23 to Sep 22', element: 'Earth', ruling: 'Mercury' },
  { name: 'Libra',       emoji: '♎', dates: 'Sep 23 to Oct 22', element: 'Air',   ruling: 'Venus'   },
  { name: 'Scorpio',     emoji: '♏', dates: 'Oct 23 to Nov 21', element: 'Water', ruling: 'Pluto'   },
  { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 to Dec 21', element: 'Fire',  ruling: 'Jupiter' },
  { name: 'Capricorn',   emoji: '♑', dates: 'Dec 22 to Jan 19', element: 'Earth', ruling: 'Saturn'  },
  { name: 'Aquarius',    emoji: '♒', dates: 'Jan 20 to Feb 18', element: 'Air',   ruling: 'Uranus'  },
  { name: 'Pisces',      emoji: '♓', dates: 'Feb 19 to Mar 20', element: 'Water', ruling: 'Neptune' },
]
