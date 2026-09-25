/*
 * In-memory fake backend used by MSW handlers (dev + tests).
 * Shapes must match lib/types.ts, which mirrors the FastAPI schemas.
 * Delete once the real routes exist and a seeded dev DB replaces this.
 */
import type {
  Character,
  CharacterList,
  CharacterQuery,
  ChatSummary,
  Genre,
  Model,
  Persona,
  Preset,
  ResponseLength,
  UserSettings,
} from '@/lib/types'
import sampleArt from '@/features/home/hero.png'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

type Seed = Omit<Character, 'createdAt' | 'lastChattedAt' | 'bookmarked' | 'avatarUrl'> & {
  createdDaysAgo: number
  lastChattedMsAgo?: number
}

const seeds: Seed[] = [
  { id: 'rowan', name: 'Rowan of the Hearth', title: 'Keeper of the Mountain Inn', quote: 'The kettle is whistling. Sit by the fire before the mountain storm sets in.', description: 'Runs a warm inn high on the pass, and remembers every traveller by the tea they take.', genre: 'fireside-fantasy', style: 'Slow burn', tags: ['Cozy Fantasy', 'Warm'], createdDaysAgo: 40, lastChattedMsAgo: 20 * MINUTE },
  { id: 'vane', name: 'Professor Vane', title: 'Horologist of the Quiet Library', quote: 'Look closely at the gear teeth; someone altered the escapement intentionally.', description: 'A retired clockmaker who treats every mystery like a broken movement.', genre: 'cozy-mystery', style: 'Rich narrative', tags: ['Mystery', 'Mentor'], createdDaysAgo: 35, lastChattedMsAgo: 2 * HOUR },
  { id: 'lyra', name: 'Lyra the Apprentice', title: 'Student of the Bell Tower', quote: 'If the stars are hidden tonight, we will navigate by the clocktower bell.', description: 'An astronomer’s apprentice who charts the sky from a crowded tower room.', genre: 'mythic', style: 'Philosophical', tags: ['Mythic', 'Stargazing'], createdDaysAgo: 30, lastChattedMsAgo: 1 * DAY },
  { id: 'sylvan', name: 'Sylvan', title: 'Herbalist of Oakhaven', quote: 'Patience brews a sweeter draught than haste.', description: 'Tends a shop of hanging herbs and slow remedies at the edge of the wood.', genre: 'fireside-fantasy', style: 'Slow burn', tags: ['Cozy Fantasy', 'Quiet Guide'], createdDaysAgo: 3 },
  { id: 'clara', name: 'Clara Finch', title: 'Antiquarian & Curio Scout', quote: 'Every forgotten letter hides a heartbeat.', description: 'A midnight train stalled upon the moorlands. An unopened letter rests on the velvet seat.', genre: 'cozy-mystery', style: 'Rich narrative', tags: ['Gentle Mystery', 'Victorian'], createdDaysAgo: 5 },
  { id: 'bramble', name: 'Bramble', title: 'The Hearth Guardian', quote: 'Dry twigs first, dry thoughts second.', description: 'A small forest spirit who lives in the kindling box and judges your fire-building.', genre: 'mythic', style: 'Casual dialogue', tags: ['Mythic', 'Warm Spirit'], createdDaysAgo: 8 },
  { id: 'judith', name: 'Captain Judith Ward', title: 'Navigator of the Aetheris', quote: 'The sea listens to those who don’t shout.', description: 'Commands a brass-hulled airship and trusts her instruments more than her crew.', genre: 'fireside-fantasy', style: 'Rich narrative', tags: ['Nautical', 'Steampunk'], createdDaysAgo: 12 },
  { id: 'aiden', name: 'Aiden', title: 'The Night Librarian', quote: 'Some pages are meant to be turned after midnight.', description: 'Keeps the reading room open long after the town sleeps.', genre: 'slice-of-life', style: 'Slow burn', tags: ['Slice of Life', 'Scholarly'], createdDaysAgo: 14 },
  { id: 'mirei', name: 'Mirei', title: 'Stargazer of the Ridge', quote: 'Even the darkest orbit completes its circle.', description: 'Reads the sky from a mountain observatory and speaks in long, calm arcs.', genre: 'scholarly-historical', style: 'Philosophical', tags: ['Philosophy', 'Tranquil'], createdDaysAgo: 18 },
  { id: 'elowen', name: 'Elowen', title: 'The Clocksmith Apprentice', quote: 'Time doesn’t heal; it just makes room for gentler things.', description: 'Repairs pocket watches for a living and other people’s bad days for free.', genre: 'slice-of-life', style: 'Slow burn', tags: ['Clockpunk', 'Gentle Companion'], createdDaysAgo: 21 },
  { id: 'barnaby', name: 'Barnaby the Herbalist', title: 'Keeper of the Briar Burrow', quote: 'Chamomile for the nerves, and a biscuit for the rest of you.', description: 'A quiet burrow tucked beneath the ancient briar root. He knows remedies for heavy hearts.', genre: 'fireside-fantasy', style: 'Slow burn', tags: ['Cozy Fantasy', 'Remedies'], createdDaysAgo: 2 },
  { id: 'jin', name: 'Master Archivist Jin', title: 'Guardian of the Uncopied Scrolls', quote: 'History is written twice: once in ink, once in silence.', description: 'Guardian of uncopied historical scrolls during a court succession that reshaped the dynasty.', genre: 'scholarly-historical', style: 'Philosophical', tags: ['Historical', 'Court Intrigue'], createdDaysAgo: 4 },
  { id: 'saffron', name: 'Saffron the Weaver', title: 'Loom-keeper of the Crossroads', quote: 'Every thread remembers the hand that pulled it.', description: 'She weaves tapestry threads made from travellers’ remembered songs. Come sit by the loom.', genre: 'slice-of-life', style: 'Gentle slice of life', tags: ['Slice of Life', 'Craft'], createdDaysAgo: 6 },
]

const INITIAL_BOOKMARKS = ['sylvan', 'mirei']
const bookmarks = new Set<string>(INITIAL_BOOKMARKS)

/** Restore initial state. Called between tests so mutations don't leak. */
export function resetDb(): void {
  bookmarks.clear()
  INITIAL_BOOKMARKS.forEach((id) => bookmarks.add(id))
  activePersonaId = INITIAL_ACTIVE_PERSONA
  chatsDeleted = false
  settings = { ...INITIAL_SETTINGS }
}

function build(seed: Seed): Character {
  const { createdDaysAgo, lastChattedMsAgo, ...rest } = seed
  return {
    ...rest,
    avatarUrl: null,
    bookmarked: bookmarks.has(seed.id),
    createdAt: ago(createdDaysAgo * DAY),
    lastChattedAt: lastChattedMsAgo === undefined ? null : ago(lastChattedMsAgo),
  }
}

// Personas: Ren (the default) has no picture, so the monogram path stays covered.
// The others borrow the Home hero art as a stand in until avatar uploads exist.
const PERSONAS: readonly Persona[] = [
  { id: 'ren', name: 'Ren', avatarUrl: null },
  { id: 'mira', name: 'Mira', avatarUrl: sampleArt },
  { id: 'kael', name: 'Kael', avatarUrl: sampleArt },
  { id: 'sol', name: 'Sol', avatarUrl: sampleArt },
]
const INITIAL_ACTIVE_PERSONA = 'ren'
let activePersonaId = INITIAL_ACTIVE_PERSONA

/** Every persona, sorted by name (case insensitive), like the real API. */
export function listPersonas(): Persona[] {
  return [...PERSONAS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export function getActivePersona(): Persona {
  return PERSONAS.find((p) => p.id === activePersonaId)!
}

/** @returns the new active persona, or undefined for an unknown id (handler maps to 404). */
export function setActivePersona(id: string): Persona | undefined {
  const persona = PERSONAS.find((p) => p.id === id)
  if (persona) activePersonaId = persona.id
  return persona
}

let chatsDeleted = false

/** DELETE /chats: every chat is gone until resetDb(). */
export function deleteAllChats(): void {
  chatsDeleted = true
}

// Server side settings. Presets mirror backend app/safety/presets.py without
// "adult", which needs an age verified opt in that doesn't exist yet. The
// default model is backend config.py's ollama_model.
const PRESETS: readonly Preset[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Suitable for a general audience. Romance stays gentle and fades to black.',
  },
]

const MODELS: readonly Model[] = [
  { id: 'llama3.1:8b', label: 'Llama 3.1 8B (on this computer)', provider: 'ollama' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', provider: 'openrouter' },
  { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo', provider: 'openrouter' },
]

const INITIAL_SETTINGS: UserSettings = {
  defaultPresetId: 'default',
  modelId: 'llama3.1:8b',
  responseLength: 'medium',
  modelNotice: null,
}
let settings: UserSettings = { ...INITIAL_SETTINGS }

export function listPresets(): Preset[] {
  return [...PRESETS]
}

export function listModels(): Model[] {
  return [...MODELS]
}

export function getSettings(): UserSettings {
  return { ...settings }
}

const RESPONSE_LENGTHS: readonly ResponseLength[] = ['short', 'medium', 'long']

/** @returns the full settings, or null when a field is invalid (handler maps to 422). */
export function updateSettings(patch: Record<string, unknown>): UserSettings | null {
  const { defaultPresetId, modelId, responseLength } = patch
  if (defaultPresetId !== undefined && !PRESETS.some((p) => p.id === defaultPresetId)) return null
  if (modelId !== undefined && !MODELS.some((m) => m.id === modelId)) return null
  if (responseLength !== undefined && !RESPONSE_LENGTHS.includes(responseLength as ResponseLength)) return null
  settings = {
    ...settings,
    ...(defaultPresetId !== undefined && { defaultPresetId: defaultPresetId as string }),
    ...(modelId !== undefined && { modelId: modelId as string, modelNotice: null }),
    ...(responseLength !== undefined && { responseLength: responseLength as ResponseLength }),
  }
  return getSettings()
}

export function listChats(limit?: number): ChatSummary[] {
  if (chatsDeleted) return []
  const chats: Array<[string, ChatSummary['character']['role'], string, number]> = [
    ['rowan', 'companion', 'Campfire Scene', 4],
    ['vane', 'mentor', 'Quiet Library', 9],
    ['lyra', 'ally', 'Bell Tower', 2],
  ]
  return chats.map(([id, role, sceneLabel, chapter]) => {
    const c = build(seeds.find((s) => s.id === id)!)
    return {
      id: `chat-${id}`,
      character: { id: c.id, name: c.name, avatarUrl: c.avatarUrl, role },
      sceneLabel,
      lastLine: c.quote,
      chapter,
      updatedAt: c.lastChattedAt ?? c.createdAt,
    }
  }).slice(0, limit)
}

export function getChat(id: string): ChatSummary | undefined {
  return listChats().find((c) => c.id === id)
}

/** @returns the character, or undefined when the id doesn't exist (handler maps to 404). */
export function getCharacter(id: string): Character | undefined {
  const seed = seeds.find((s) => s.id === id)
  return seed ? build(seed) : undefined
}

export function listFeaturedCharacters(): Character[] {
  return ['barnaby', 'clara', 'jin', 'saffron', 'bramble', 'judith'].map((id) => build(seeds.find((s) => s.id === id)!))
}

export function listCharacters(query: CharacterQuery): CharacterList {
  const q = query.q?.trim().toLowerCase() ?? ''
  const matchesQ = (c: Character) =>
    !q || [c.name, c.title, c.description, c.style, ...c.tags].some((f) => f.toLowerCase().includes(q))

  const searched = seeds.map(build).filter(matchesQ)

  const genreCounts: Partial<Record<Genre, number>> = {}
  for (const c of searched) genreCounts[c.genre] = (genreCounts[c.genre] ?? 0) + 1

  const items = searched.filter((c) => !query.genre || c.genre === query.genre)
  const time = (d: string | null) => (d ? Date.parse(d) : 0)
  switch (query.sort ?? 'recent') {
    case 'name':
      items.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'newest':
      items.sort((a, b) => time(b.createdAt) - time(a.createdAt))
      break
    case 'recent':
      items.sort((a, b) => time(b.lastChattedAt) - time(a.lastChattedAt) || time(b.createdAt) - time(a.createdAt))
      break
  }

  return { items, total: searched.length, genreCounts }
}

/** @returns the updated character, or undefined when the id doesn't exist (handler maps to 404). */
export function setBookmark(id: string, bookmarked: boolean): Character | undefined {
  const seed = seeds.find((s) => s.id === id)
  if (!seed) return undefined
  if (bookmarked) bookmarks.add(id)
  else bookmarks.delete(id)
  return build(seed)
}
