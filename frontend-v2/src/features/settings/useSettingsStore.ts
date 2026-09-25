// Browser only settings: theme, chat text size and the send key. Saved in
// localStorage (every access in try/catch; blocked storage just means the
// choice lasts for this session) and mirrored onto <html>:
//   data-theme          'dark' | 'light' (System resolves to one of them)
//   --chat-font-size    15px | 16px | 18px
// index.html runs a tiny copy of the theme and text size logic before first
// paint; keep the keys and values in sync with it.
import { useSyncExternalStore } from 'react'

/** The theme actually on screen. */
export type Theme = 'dark' | 'light'
/** What the person picked. 'system' follows the OS and updates live. */
export type ThemePreference = Theme | 'system'
export type ChatTextSize = 'small' | 'medium' | 'large'
/** Which key sends a chat message. On touch devices Enter always adds a new line. */
export type SendWith = 'enter' | 'ctrl-enter'

export const THEME_STORAGE_KEY = 'renoog.theme'
export const CHAT_TEXT_SIZE_STORAGE_KEY = 'renoog.chatTextSize'
export const SEND_WITH_STORAGE_KEY = 'renoog.sendWith'

export const CHAT_FONT_SIZES: Record<ChatTextSize, string> = { small: '15px', medium: '16px', large: '18px' }

const LIGHT_QUERY = '(prefers-color-scheme: light)'

type State = {
  themePreference: ThemePreference
  systemTheme: Theme
  chatTextSize: ChatTextSize
  sendWith: SendWith
}

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    const match = allowed.find((value) => value === saved)
    if (match) return match
  } catch {
    // Storage blocked (private mode, disabled cookies): use the default.
  }
  return fallback
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not saved, but the change still applies for this session.
  }
}

const media = typeof window.matchMedia === 'function' ? window.matchMedia(LIGHT_QUERY) : null
const systemTheme = (): Theme => (media?.matches ? 'light' : 'dark')

let state: State = {
  themePreference: read<ThemePreference>(THEME_STORAGE_KEY, ['dark', 'light', 'system'], 'dark'),
  systemTheme: systemTheme(),
  chatTextSize: read<ChatTextSize>(CHAT_TEXT_SIZE_STORAGE_KEY, ['small', 'medium', 'large'], 'medium'),
  sendWith: read<SendWith>(SEND_WITH_STORAGE_KEY, ['enter', 'ctrl-enter'], 'enter'),
}

const listeners = new Set<() => void>()

export function resolveTheme({ themePreference, systemTheme }: Pick<State, 'themePreference' | 'systemTheme'>): Theme {
  return themePreference === 'system' ? systemTheme : themePreference
}

function apply() {
  const root = document.documentElement
  root.dataset.theme = resolveTheme(state)
  root.style.setProperty('--chat-font-size', CHAT_FONT_SIZES[state.chatTextSize])
}

function update(changes: Partial<State>) {
  state = { ...state, ...changes }
  apply()
  listeners.forEach((listener) => listener())
}

// Follow the OS live. Only matters while the preference is 'system', but
// tracking it always means switching to System shows the right theme at once.
media?.addEventListener('change', () => update({ systemTheme: systemTheme() }))
apply()

function setTheme(themePreference: ThemePreference) {
  write(THEME_STORAGE_KEY, themePreference)
  update({ themePreference })
}

/** The Navbar lamp: flips what's on screen between dark and light (leaving System). */
function toggleTheme() {
  setTheme(resolveTheme(state) === 'dark' ? 'light' : 'dark')
}

function setChatTextSize(chatTextSize: ChatTextSize) {
  write(CHAT_TEXT_SIZE_STORAGE_KEY, chatTextSize)
  update({ chatTextSize })
}

function setSendWith(sendWith: SendWith) {
  write(SEND_WITH_STORAGE_KEY, sendWith)
  update({ sendWith })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getState = () => state

export function useSettingsStore() {
  const current = useSyncExternalStore(subscribe, getState, getState)
  return {
    /** The theme on screen, always 'dark' or 'light'. */
    theme: resolveTheme(current),
    themePreference: current.themePreference,
    chatTextSize: current.chatTextSize,
    sendWith: current.sendWith,
    setTheme,
    toggleTheme,
    setChatTextSize,
    setSendWith,
  }
}
