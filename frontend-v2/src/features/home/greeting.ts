// Home greeting by the viewer's local time: morning 5:00 to 11:59,
// afternoon 12:00 to 17:59, evening 18:00 to 4:59.

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}
