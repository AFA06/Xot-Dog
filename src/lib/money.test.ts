import { describe, expect, it } from 'vitest'
import { formatCompactUZS, formatUZS, groupDigits } from './money'

describe('money', () => {
  it('formats UZS with grouped digits in both languages', () => {
    expect(groupDigits(1250000)).toBe('1 250 000')
    expect(formatUZS(32000, 'uz')).toBe("32 000 so'm")
    expect(formatUZS(32000, 'ru')).toBe('32 000 сум')
    expect(formatUZS(0)).toBe("0 so'm")
  })
  it('compacts large values', () => {
    expect(formatCompactUZS(1_500_000, 'uz')).toBe('1,5 mln')
    expect(formatCompactUZS(350_000, 'ru')).toBe('350 тыс')
  })
})
