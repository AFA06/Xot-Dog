import type { Branch, Locale } from '@/domain/types'

/** "Chilonzor filiali" → "Chilonzor", "Филиал Чиланзар" → "Чиланзар" */
export function shortBranchName(b: Branch | undefined, locale: Locale): string {
  if (!b) return '—'
  return b.name[locale].replace(/\s*filiali\s*/i, '').replace(/^Филиал\s*/i, '').trim()
}

/** Branch → fixed categorical slot. Color follows the entity, never its rank. */
export function branchColor(branches: Branch[], id: string): string {
  const i = branches.findIndex((b) => b.id === id)
  return `var(--series-${i + 1})`
}
