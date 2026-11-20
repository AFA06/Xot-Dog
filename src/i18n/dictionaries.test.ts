import { describe, expect, it } from 'vitest'
import { DICTIONARIES } from './dictionaries'

describe('i18n', () => {
  it('uz and ru have identical, non-empty keys', () => {
    const uz = Object.keys(DICTIONARIES.uz).sort()
    const ru = Object.keys(DICTIONARIES.ru).sort()
    expect(ru).toEqual(uz)
    for (const k of uz) {
      expect(DICTIONARIES.uz[k as keyof typeof DICTIONARIES.uz]).not.toBe('')
      expect(DICTIONARIES.ru[k as keyof typeof DICTIONARIES.ru]).not.toBe('')
    }
  })
})
