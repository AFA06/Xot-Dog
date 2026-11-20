import type { DateRange } from '@/domain/types'

export type RangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom'

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** yyyy-mm-dd in local time */
export function toDateKey(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function presetRange(preset: Exclude<RangePreset, 'custom'>, now = new Date()): DateRange {
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)
  switch (preset) {
    case 'today':
      return { from: today.toISOString(), to: tomorrow.toISOString() }
    case 'yesterday':
      return { from: addDays(today, -1).toISOString(), to: today.toISOString() }
    case 'last7':
      return { from: addDays(today, -6).toISOString(), to: tomorrow.toISOString() }
    case 'last30':
      return { from: addDays(today, -29).toISOString(), to: tomorrow.toISOString() }
    case 'thisMonth':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), to: tomorrow.toISOString() }
  }
}

/** Custom range from inclusive local date keys. */
export function customRange(fromKey: string, toKey: string): DateRange {
  const a = fromDateKey(fromKey)
  const b = fromDateKey(toKey)
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  return { from: lo.toISOString(), to: addDays(hi, 1).toISOString() }
}

/** Same-length range immediately before. */
export function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from)
  const to = new Date(range.to)
  const span = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - span).toISOString(), to: range.from }
}

/** Local date keys contained in range. */
export function daysInRange(range: DateRange): string[] {
  const out: string[] = []
  let d = startOfDay(new Date(range.from))
  const end = new Date(range.to)
  while (d < end) {
    out.push(toDateKey(d))
    d = addDays(d, 1)
  }
  return out
}

/**
 * Previous period for like-for-like comparison: if the range extends past `now`
 * (e.g. "today" or "last 7 days" mid-day), only the elapsed part is compared.
 */
export function comparisonRange(range: DateRange, now = new Date()): DateRange {
  const prev = previousRange(range)
  if (new Date(range.to) <= now) return prev
  const elapsed = Math.max(0, now.getTime() - new Date(range.from).getTime())
  return { from: prev.from, to: new Date(new Date(prev.from).getTime() + elapsed).toISOString() }
}
