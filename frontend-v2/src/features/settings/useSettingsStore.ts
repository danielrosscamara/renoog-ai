// Settings store (theme for now). Mirrors the theme onto <html data-theme> and
// saves it under 'renoog.theme', the key the index.html boot script reads.
import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'renoog.theme'

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
}

function readInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(saved)) return saved
  } catch {
    // Storage blocked (private mode, disabled cookies): fall through.
  }
  const current = document.documentElement.dataset.theme
  return isTheme(current) ? current : 'dark'
}

let theme: Theme = readInitialTheme()
const listeners = new Set<() => void>()

function setTheme(next: Theme) {
  theme = next
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Not saved, but the theme still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

function toggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark')
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getTheme = () => theme

export function useSettingsStore() {
  const current = useSyncExternalStore(subscribe, getTheme, getTheme)
  return { theme: current, setTheme, toggleTheme }
}
