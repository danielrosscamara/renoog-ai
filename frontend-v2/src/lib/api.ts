import type { Character, CharacterList, CharacterQuery, ChatSummary, Model, Persona, Preset, UserSettings, UserSettingsPatch } from './types'

/**
 * The only module that calls fetch(). Hooks and stores go through `api.*`, never fetch directly.
 * In development with VITE_USE_MOCKS=true, MSW (src/mocks) intercepts these requests at the
 * network layer — nothing in this file knows whether the data is real or mocked.
 */

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal | undefined
}

/**
 * Resolves a path against VITE_API_URL (or the page origin when unset).
 * Always absolute so it also works under Node/jsdom in tests.
 */
export function apiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = import.meta.env.VITE_API_URL || window.location.origin
  const url = new URL(path.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`)
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  return url.toString()
}

/**
 * JSON request helper.
 * @throws ApiError on non-2xx (with the backend's generic { code, message }) or network failure.
 *         AbortError is re-thrown untouched so TanStack Query can treat it as a cancel.
 */
async function request<T>(url: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      credentials: 'include', // Phase 2: session cookie (httpOnly) — never a token in JS
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
      signal: signal ?? null,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error', 'Could not reach the server.')
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { code?: string; message?: string } | null
    throw new ApiError(res.status, data?.code ?? 'http_error', data?.message ?? 'Something went wrong.')
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  /** Every persona you can chat as, sorted by name. */
  listPersonas: (signal?: AbortSignal) => request<Persona[]>(apiUrl('/personas'), { signal }),

  getActivePersona: (signal?: AbortSignal) => request<Persona>(apiUrl('/personas/active'), { signal }),

  /** Makes `personaId` the persona your next messages are written as. 404 if it isn't yours. */
  setActivePersona: (personaId: string) =>
    request<Persona>(apiUrl('/personas/active'), { method: 'PUT', body: { personaId } }),

  /** Chats, most recently updated first. Omit `limit` for the full list. */
  listChats: (params: { limit?: number } = {}, signal?: AbortSignal) =>
    request<ChatSummary[]>(apiUrl('/chats', params), { signal }),

  getChat: (id: string, signal?: AbortSignal) => request<ChatSummary>(apiUrl(`/chats/${encodeURIComponent(id)}`), { signal }),

  /** Deletes every chat you have. 204, no body. */
  deleteAllChats: () => request<void>(apiUrl('/chats'), { method: 'DELETE' }),

  getSettings: (signal?: AbortSignal) => request<UserSettings>(apiUrl('/settings'), { signal }),

  /** Partial update. Returns the full settings. 422 for an unknown preset or model id. */
  updateSettings: (patch: UserSettingsPatch) =>
    request<UserSettings>(apiUrl('/settings'), { method: 'PATCH', body: patch }),

  listPresets: (signal?: AbortSignal) => request<Preset[]>(apiUrl('/presets'), { signal }),

  listModels: (signal?: AbortSignal) => request<Model[]>(apiUrl('/models'), { signal }),

  listCharacters: (query: CharacterQuery = {}, signal?: AbortSignal) =>
    request<CharacterList>(apiUrl('/characters', { q: query.q, genre: query.genre, sort: query.sort }), { signal }),

  listFeaturedCharacters: (signal?: AbortSignal) => request<Character[]>(apiUrl('/characters/featured'), { signal }),

  getCharacter: (id: string, signal?: AbortSignal) =>
    request<Character>(apiUrl(`/characters/${encodeURIComponent(id)}`), { signal }),

  setBookmark: (id: string, bookmarked: boolean) =>
    request<Character>(apiUrl(`/characters/${encodeURIComponent(id)}`), { method: 'PATCH', body: { bookmarked } }),
}
