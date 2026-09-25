// Short relative timestamps for cards: "Just now", "5m ago", "3h ago",
// "Yesterday", then a date ("Oct 12", or "Oct 12, 2025" in another year).
// Days are local calendar days, so "Yesterday" means the viewer's yesterday.

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const sameYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const otherYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Formats an ISO timestamp relative to `now`.
 * Future times (clock skew) and anything under a minute read "Just now".
 * Invalid input returns an empty string rather than "Invalid Date".
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''

  const elapsed = now.getTime() - then.getTime()
  if (elapsed < MINUTE) return 'Just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`

  const today = startOfDay(now)
  const thenDay = startOfDay(then)
  if (thenDay === today) return `${Math.floor(elapsed / HOUR)}h ago`

  const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  if (thenDay === yesterday) return 'Yesterday'

  return (then.getFullYear() === now.getFullYear() ? sameYear : otherYear).format(then)
}
