import { useCallback } from 'react'
import type { LocalizedText } from '@/domain/types'
import { formatCompactUZS, formatUZS } from '@/lib/money'
import { useSession } from '@/store/sessionStore'
import { translate, type TranslationKey } from './dictionaries'

export function useI18n() {
  const locale = useSession((s) => s.locale)
  const setLocale = useSession((s) => s.setLocale)
  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale])
  const l = useCallback((text: LocalizedText | undefined) => (text ? text[locale] : ''), [locale])
  const money = useCallback((v: number) => formatUZS(v, locale), [locale])
  const compact = useCallback((v: number) => formatCompactUZS(v, locale), [locale])
  return { locale, setLocale, t, l, money, compact }
}
export type { TranslationKey }
