import type { Locale } from '@/domain/types'

const NBSP = ' '

/** Groups digits with non-breaking spaces: 1250000 → "1 250 000". Deterministic across browsers. */
export function groupDigits(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.round(Math.abs(value)).toString()
  return sign + abs.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

export const CURRENCY_LABEL: Record<Locale, string> = { uz: "so'm", ru: 'сум' }

/** Formats integer UZS: "32 000 so'm" / "32 000 сум". */
export function formatUZS(value: number, locale: Locale = 'uz'): string {
  return `${groupDigits(value)}${NBSP}${CURRENCY_LABEL[locale]}`
}

/** Compact form for charts/axes: 1.2M / 350K style localized. */
export function formatCompactUZS(value: number, locale: Locale = 'uz'): string {
  const abs = Math.abs(value)
  const units = locale === 'uz' ? { m: 'mln', k: 'ming' } : { m: 'млн', k: 'тыс' }
  if (abs >= 1_000_000) {
    const v = value / 1_000_000
    return `${v.toFixed(abs >= 10_000_000 ? 0 : 1).replace('.', ',')}${NBSP}${units.m}`
  }
  if (abs >= 1000) return `${Math.round(value / 1000)}${NBSP}${units.k}`
  return groupDigits(value)
}
