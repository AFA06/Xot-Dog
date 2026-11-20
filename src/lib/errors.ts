import { ApiError } from '@/services/api/client'
import type { TranslationKey } from '@/i18n/dictionaries'

const CODE_KEYS: Record<string, TranslationKey> = {
  network: 'err.network',
  price_changed: 'err.priceChanged',
  product_unavailable: 'err.productUnavailable',
  insufficient_cash: 'err.insufficientCash',
  forbidden: 'err.forbidden',
  locked: 'auth.locked',
  wrong_pin: 'launcher.wrongPin',
  wrong_branch: 'auth.wrongBranch',
  admin_only: 'auth.adminOnly',
  unauthorized: 'launcher.sessionExpired',
}

/** Localized message for backend error codes; falls back to the server's message. */
export function errorText(e: unknown, t: (k: TranslationKey) => string): string {
  if (e instanceof ApiError) {
    const key = CODE_KEYS[e.code]
    return key ? t(key) : e.message || t('err.generic')
  }
  return e instanceof Error && e.message ? e.message : t('err.generic')
}
