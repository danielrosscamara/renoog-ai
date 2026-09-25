import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './time'

// Local times, so the calendar day checks hold in any timezone.
const now = new Date(2026, 9, 14, 15, 0, 0) // Oct 14 2026, 3:00 pm
const at = (...args: [number, number, number, number?, number?, number?]) => new Date(...args).toISOString()

describe('formatRelativeTime', () => {
  it('says "Just now" under a minute, and for future times', () => {
    expect(formatRelativeTime(at(2026, 9, 14, 14, 59, 30), now)).toBe('Just now')
    expect(formatRelativeTime(now.toISOString(), now)).toBe('Just now')
    expect(formatRelativeTime(at(2026, 9, 14, 15, 5), now)).toBe('Just now')
  })

  it('counts minutes under an hour', () => {
    expect(formatRelativeTime(at(2026, 9, 14, 14, 59), now)).toBe('1m ago')
    expect(formatRelativeTime(at(2026, 9, 14, 14, 1), now)).toBe('59m ago')
  })

  it('counts hours earlier the same day', () => {
    expect(formatRelativeTime(at(2026, 9, 14, 14, 0), now)).toBe('1h ago')
    expect(formatRelativeTime(at(2026, 9, 14, 0, 30), now)).toBe('14h ago')
  })

  it('says "Yesterday" for the previous calendar day, even if under 24 hours ago', () => {
    expect(formatRelativeTime(at(2026, 9, 13, 23, 0), now)).toBe('Yesterday')
    expect(formatRelativeTime(at(2026, 9, 13, 0, 1), now)).toBe('Yesterday')
  })

  it('prefers minutes just after midnight', () => {
    const justAfterMidnight = new Date(2026, 9, 14, 0, 20)
    expect(formatRelativeTime(at(2026, 9, 13, 23, 50), justAfterMidnight)).toBe('30m ago')
    expect(formatRelativeTime(at(2026, 9, 13, 22, 0), justAfterMidnight)).toBe('Yesterday')
  })

  it('handles yesterday across a month boundary', () => {
    expect(formatRelativeTime(at(2026, 8, 30, 12, 0), new Date(2026, 9, 1, 9, 0))).toBe('Yesterday')
  })

  it('shows a short date for older times this year', () => {
    expect(formatRelativeTime(at(2026, 9, 12, 9, 0), now)).toBe('Oct 12')
    expect(formatRelativeTime(at(2026, 0, 3, 9, 0), now)).toBe('Jan 3')
  })

  it('adds the year for times in another year', () => {
    expect(formatRelativeTime(at(2025, 9, 12, 9, 0), now)).toBe('Oct 12, 2025')
  })

  it('returns an empty string for invalid input', () => {
    expect(formatRelativeTime('not a date', now)).toBe('')
  })
})
