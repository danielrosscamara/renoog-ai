// First letter of a name for avatar fallbacks, skipping titles and articles
// ("Professor Ada" gives "A", "The Wanderer" gives "W").

const SKIPPED = new Set([
  'the', 'a', 'an',
  'professor', 'prof', 'dr', 'doctor', 'mr', 'mrs', 'ms', 'miss', 'mx',
  'sir', 'dame', 'lady', 'lord', 'captain', 'capt',
  'king', 'queen', 'prince', 'princess', 'saint', 'st',
])

export function monogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.,]/g, ''))
    .filter(Boolean)
  const word = words.find((w) => !SKIPPED.has(w.toLowerCase())) ?? words[0]
  const first = word ? Array.from(word)[0] : undefined
  return first ? first.toUpperCase() : '?'
}
