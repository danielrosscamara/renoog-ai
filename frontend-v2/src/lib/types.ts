/*
 * Frontend view of the API contract. Keep in sync with backend Pydantic schemas;
 * when the backend ships an OpenAPI spec, generate these instead of hand-writing them.
 */

export type ISODateString = string

export const GENRES = [
  'cozy-mystery',
  'fireside-fantasy',
  'slice-of-life',
  'scholarly-historical',
  'mythic',
] as const
export type Genre = (typeof GENRES)[number]

export const GENRE_LABELS: Record<Genre, string> = {
  'cozy-mystery': 'Cozy Mystery',
  'fireside-fantasy': 'Fireside Fantasy',
  'slice-of-life': 'Gentle Slice of Life',
  'scholarly-historical': 'Scholarly & Historical',
  mythic: 'Mythic Tales',
}

export type CharacterRole = 'companion' | 'mentor' | 'ally'

export interface Character {
  id: string
  name: string
  /** Short epithet shown under the name, e.g. "Herbalist of Oakhaven". */
  title: string
  /** One-line sample of the character's voice. Untrusted card text — render as plain text only. */
  quote: string
  description: string
  genre: Genre
  /** Narrative pacing / style label, e.g. "Slow burn". */
  style: string
  tags: string[]
  avatarUrl: string | null
  bookmarked: boolean
  createdAt: ISODateString
  lastChattedAt: ISODateString | null
}

export interface ChatSummary {
  id: string
  character: Pick<Character, 'id' | 'name' | 'avatarUrl'> & { role: CharacterRole }
  sceneLabel: string
  /** Last message of the chat. Untrusted model output — plain text only. */
  lastLine: string
  chapter: number
  updatedAt: ISODateString
}

export interface Persona {
  id: string
  name: string
  avatarUrl: string | null
}

export type CharacterSort = 'recent' | 'newest' | 'name'

export interface CharacterQuery {
  q?: string
  genre?: Genre
  sort?: CharacterSort
}

export interface CharacterList {
  items: Character[]
  total: number
  /** Count per genre for the unfiltered-by-genre result, used for filter chips. */
  genreCounts: Partial<Record<Genre, number>>
}

export type ResponseLength = 'short' | 'medium' | 'long'

/** Per user settings kept on the server (GET/PATCH /settings). */
export interface UserSettings {
  /** Id from GET /presets. The client only ever sends ids, never prompt text. */
  defaultPresetId: string
  /** Id from GET /models. */
  modelId: string
  responseLength: ResponseLength
  /** Set by the server when it had to change something, e.g. "Your model was retired; switched to X". */
  modelNotice: string | null
}

/** PATCH /settings body: any subset of the editable fields. */
export type UserSettingsPatch = Partial<Pick<UserSettings, 'defaultPresetId' | 'modelId' | 'responseLength'>>

/** A story style preset. Ids and labels only; prompt text never leaves the server. */
export interface Preset {
  id: string
  label: string
  description: string
}

export type ModelProvider = 'ollama' | 'openrouter'

export interface Model {
  id: string
  label: string
  provider: ModelProvider
}

/** POST /chats/:chatId/stream body. `text` is 1 to 4000 characters. */
export interface StreamRequest {
  text: string
}

export interface PhoneNumber {
  /** Digits for a tel: link. */
  value: string
  /** How to show it, e.g. "0917-899-8727". */
  display: string
  type: 'mobile' | 'landline'
  note: string | null
}

/** A crisis line. Numbers arrive mobile first and are never labelled by carrier. */
export interface Hotline {
  name: string
  operator: string | null
  hours: string | null
  cost: string | null
  note: string | null
  numbers: PhoneNumber[]
}

export type MessageStatus = 'ok' | 'partial' | 'blocked' | 'failed'

/**
 * One Server Sent Event from POST /chats/:chatId/stream (`event:` is `type`).
 * Order: `crisis` then `done`; otherwise at most one `notice`, any `token`s, optionally
 * `blocked` or `error`, then `done`. An `error` with code `internal_error` ends the stream.
 */
export type StreamEvent =
  /** Checked reply text (untrusted model output); append it. */
  | { type: 'token'; text: string }
  /** Tier 2: non-blocking resource chip. The character still replies. */
  | { type: 'notice'; text: string; disclaimer: string; hotlines: Hotline[] }
  /** Tier 3: the model was not called. A neutral system message, never a character bubble. */
  | { type: 'crisis'; heading: string; body: string; disclaimer: string; hotlines: Hotline[] }
  /** The output guard stopped the reply: replace the whole bubble with `replacement`. */
  | { type: 'blocked'; replacement: string }
  /** `message` is safe to show. */
  | { type: 'error'; code: string; message: string }
  | { type: 'done'; messageId: string; status: MessageStatus }
