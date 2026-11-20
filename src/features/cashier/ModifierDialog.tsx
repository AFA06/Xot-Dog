import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ModifierGroup, Product } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import {
  defaultSelection,
  missingRequiredGroups,
  resolveModifiers,
  toggleOption,
  unitPrice,
  type ModifierSelection,
} from '@/lib/cart'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePos } from './posStore'

export function ModifierDialog({
  product,
  groups,
  onClose,
}: {
  product: Product | null
  groups: ModifierGroup[]
  onClose(): void
}) {
  const { t, l, money } = useI18n()
  const add = usePos((s) => s.add)
  const [sel, setSel] = useState<ModifierSelection>({})
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (product) {
      setSel(defaultSelection(product, groups))
      setQty(1)
    }
  }, [product, groups])

  const productGroups = useMemo(
    () => (product ? product.modifierGroupIds.map((id) => groups.find((g) => g.id === id)).filter((g): g is ModifierGroup => !!g) : []),
    [product, groups],
  )

  if (!product) return null
  const mods = resolveModifiers(product, groups, sel)
  const missing = missingRequiredGroups(product, groups, sel)
  const total = unitPrice({ basePrice: product.price, modifiers: mods }) * qty

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="text-xl">{l(product.name)}</DialogTitle>
          <DialogDescription>
            {product.description ? `${l(product.description)} · ` : ''}
            {money(product.price)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {productGroups.map((g) => (
            <section key={g.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="font-semibold">{l(g.name)}</h3>
                <span className={cn('text-xs', g.required ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                  {g.required ? t('pos.required') : t('pos.optional')}
                  {g.max ? ` · ${g.max} ${t('pos.upTo')}` : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.options.map((o) => {
                  const on = sel[g.id]?.includes(o.id) ?? false
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSel((s) => toggleOption(s, g, o.id))}
                      aria-pressed={on}
                      className={cn(
                        'flex min-h-14 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left',
                        on ? 'border-primary bg-primary/8' : 'border-border bg-background',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-5 shrink-0 place-items-center border-2',
                          g.selection === 'single' ? 'rounded-full' : 'rounded-md',
                          on ? 'border-primary bg-primary text-white' : 'border-muted-foreground/40',
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-tight font-medium">{l(o.name)}</span>
                        {o.priceDelta !== 0 && (
                          <span className="text-xs text-muted-foreground tabular">
                            {o.priceDelta > 0 ? '+' : ''}
                            {groupDigits(o.priceDelta)}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          <div className="flex items-center rounded-xl border">
            <button className="grid size-14 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-1">
              <Minus className="size-5" />
            </button>
            <span className="w-10 text-center text-xl font-bold tabular">{qty}</span>
            <button className="grid size-14 place-items-center" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="+1">
              <Plus className="size-5" />
            </button>
          </div>
          <button
            disabled={missing.length > 0}
            onClick={() => {
              add(product, mods, qty)
              onClose()
            }}
            className="flex h-14 flex-1 items-center justify-between rounded-xl bg-primary px-5 text-lg font-bold text-primary-foreground disabled:opacity-40"
          >
            <span>{t('pos.add')}</span>
            <span className="tabular">{money(total)}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
