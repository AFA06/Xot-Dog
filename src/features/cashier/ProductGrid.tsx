import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Product } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePos } from './posStore'
import { TONE_BAR } from './tones'

export function ProductGrid({ products, onSelect }: { products: Product[]; onSelect(p: Product): void }) {
  const { l, t, locale } = useI18n()
  const category = usePos((s) => s.category)
  const cart = usePos((s) => s.cart)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return products.filter((p) => p.name.uz.toLowerCase().includes(q) || p.name.ru.toLowerCase().includes(q))
    return products.filter((p) => p.categoryId === category)
  }, [products, category, query])

  const qtyInCart = (id: string) => cart.filter((c) => c.productId === id).reduce((s, c) => s + c.quantity, 0)

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b bg-card/60 px-3 py-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('pos.search')}
            className="h-10 w-full rounded-lg border bg-background pr-9 pl-9 text-sm outline-none focus:border-primary"
          />
          {query && (
            <button className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground" onClick={() => setQuery('')}>
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
          {visible.map((p) => {
            const qty = qtyInCart(p.id)
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className={cn(
                  'relative flex min-h-[124px] flex-col overflow-hidden rounded-xl border-2 bg-card text-left shadow-[0_1px_0_#0000000a] active:scale-[0.98] active:bg-muted',
                  qty ? 'border-primary' : 'border-transparent',
                )}
              >
                <span className={cn('h-1.5 w-full shrink-0', TONE_BAR[p.tone])} />
                <span className="flex flex-1 flex-col p-3">
                  <span className="text-[15px] leading-tight font-semibold">{l(p.name)}</span>
                  {p.description && (
                    <span className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{l(p.description)}</span>
                  )}
                  <span className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <span className="text-lg font-bold tabular">
                      {groupDigits(p.price)}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">{locale === 'uz' ? "so'm" : 'сум'}</span>
                    </span>
                    {p.modifierGroupIds.length > 0 && <SlidersHorizontal className="mb-1 size-4 text-muted-foreground" />}
                  </span>
                </span>
                {qty > 0 && (
                  <span className="absolute top-3 right-2 grid h-7 min-w-7 place-items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground tabular">
                    {qty}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
