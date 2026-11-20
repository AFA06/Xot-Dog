import { useEffect, useState } from 'react'
import { Banknote, CreditCard, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import type { OrderType, PaymentMethod } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { cartTotals, lineTotal } from '@/lib/cart'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { usePos } from './posStore'

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange(v: T): void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'h-9 rounded-md text-sm font-semibold',
            value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CartPanel({ onCheckout }: { onCheckout(): void }) {
  const { t, l, money } = useI18n()
  const { cart, orderType, payment, setOrderType, setPayment, setQty, remove, clear } = usePos()
  const totals = cartTotals(cart)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 2500)
    return () => clearTimeout(id)
  }, [armed])

  const methods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { value: 'cash', label: t('pos.cash'), icon: Banknote },
    { value: 'card', label: t('pos.card'), icon: CreditCard },
  ]

  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l bg-card xl:w-[420px]">
      <div className="space-y-2.5 border-b p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{t('pos.cart')}</h2>
          {totals.itemCount > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular">
              {totals.itemCount} {t('pos.items')}
            </span>
          )}
          {cart.length > 0 && (
            <button
              onClick={() => (armed ? (clear(), setArmed(false)) : setArmed(true))}
              className={cn(
                'ml-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium',
                armed ? 'bg-destructive text-white' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Trash2 className="size-4" />
              {armed ? t('pos.clearConfirm') : t('pos.clear')}
            </button>
          )}
        </div>
        <Segmented<OrderType>
          value={orderType}
          onChange={setOrderType}
          options={[
            { value: 'takeaway', label: t('pos.takeaway') },
            { value: 'dine_in', label: t('pos.dineIn') },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <ShoppingBag className="size-10 opacity-40" strokeWidth={1.5} />
            <div className="font-medium text-foreground">{t('pos.emptyCart')}</div>
            <div className="text-sm">{t('pos.emptyCartHint')}</div>
          </div>
        ) : (
          <ul className="divide-y">
            {cart.map((line) => (
              <li key={line.key} className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight font-semibold">{l(line.name)}</div>
                    {line.modifiers.length > 0 && (
                      <div className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {line.modifiers
                          .map((m) => (m.priceDelta ? `${l(m.name)} ${m.priceDelta > 0 ? '+' : ''}${groupDigits(m.priceDelta)}` : l(m.name)))
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => remove(line.key)}
                    className="-mt-1 -mr-1 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label="Remove"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center">
                  <div className="flex items-center rounded-lg border">
                    <button className="grid size-11 place-items-center active:bg-muted" onClick={() => setQty(line.key, line.quantity - 1)} aria-label="-1">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-9 text-center text-base font-bold tabular">{line.quantity}</span>
                    <button className="grid size-11 place-items-center active:bg-muted" onClick={() => setQty(line.key, line.quantity + 1)} aria-label="+1">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <span className="ml-auto text-base font-bold tabular">{groupDigits(lineTotal(line))}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t bg-card p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{t('pos.total')}</span>
          <span className="text-[28px] leading-none font-extrabold tracking-tight tabular">{money(totals.total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {methods.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPayment(value)}
              aria-pressed={payment === value}
              className={cn(
                'flex h-14 items-center justify-center gap-2 rounded-xl border-2 text-base font-semibold',
                payment === value ? 'border-ink bg-ink text-white' : 'border-border bg-background',
              )}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>
        <button
          disabled={!cart.length}
          onClick={onCheckout}
          className="flex h-16 w-full items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground active:brightness-95 disabled:opacity-40"
        >
          {t('pos.confirm')}
        </button>
      </div>
    </aside>
  )
}
