// Toast queue. Call toast.info/success/error(message) from anywhere; <Toaster />
// renders the list. At most 3 on screen (oldest drops first); each auto
// dismisses after 5 seconds.
import { useSyncExternalStore } from 'react'

export type ToastKind = 'info' | 'success' | 'error'
export type ToastItem = { id: number; kind: ToastKind; message: string }

export const MAX_TOASTS = 3
export const TOAST_DURATION_MS = 5000

let toasts: readonly ToastItem[] = []
let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function dismiss(id: number) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  const next = toasts.filter((t) => t.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  emit()
}

function show(kind: ToastKind, message: string): number {
  const id = nextId++
  const next = [...toasts, { id, kind, message }]
  // Drop the oldest ones beyond the limit, clearing their timers too.
  next.slice(0, Math.max(0, next.length - MAX_TOASTS)).forEach((old) => {
    clearTimeout(timers.get(old.id))
    timers.delete(old.id)
  })
  toasts = next.slice(-MAX_TOASTS)
  timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))
  emit()
  return id
}

function clear() {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toasts = []
  emit()
}

export const toast = {
  info: (message: string) => show('info', message),
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  dismiss,
  clear,
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getToasts = () => toasts

export function useToasts(): readonly ToastItem[] {
  return useSyncExternalStore(subscribe, getToasts, getToasts)
}
