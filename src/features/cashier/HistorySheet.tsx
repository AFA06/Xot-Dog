import { useMemo } from 'react'
import { Banknote, CreditCard, Printer } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useI18n } from '@/i18n/useI18n'
import { presetRange } from '@/lib/dates'
import { summarize } from '@/lib/reports'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'

export function HistorySheet({
  open,
  onOpenChange,
  branchId,
  onOpenOrder,
}: {
  open: boolean
  onOpenChange(o: boolean): void
  branchId: string
  onOpenOrder(id: string): void
}) {
  const { t, money, l: loc } = useI18n()
  const orders = useApp((s) => s.orders)
  const staff = useApp((s) => s.staff)

  const today = useMemo(() => {
    if (!open) return []
    const r = presetRange('today')
    return orders.filter((o) => o.branchId === branchId && o.createdAt >= r.from && o.createdAt < r.to)
  }, [orders, branchId, open])
  const sum = summarize(today)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="text-xl">{t('pos.todayOrders')}</SheetTitle>
          <SheetDescription className="tabular">
            {sum.orders} · {money(sum.revenue)}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {today.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">{t('pos.noOrders')}</p>
          ) : (
            <ul className="divide-y">
              {today.map((o) => {
                const cashier = staff.find((s) => s.id === o.cashierId)
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => onOpenOrder(o.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted active:bg-muted"
                    >
                      <div className="w-[72px] shrink-0">
                        <div className={cn('font-bold tabular', o.status === 'voided' && 'line-through opacity-50')}>{o.number}</div>
                        <div className="text-xs text-muted-foreground tabular">
                          {new Date(o.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="truncate">{o.lines.map((l) => `${l.quantity}× ${loc(l.name)}`).join(', ')}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {o.payment.method === 'cash' ? <Banknote className="size-3.5" /> : <CreditCard className="size-3.5" />}
                          {cashier?.name}
                          {o.printCount > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              · <Printer className="size-3" /> {o.printCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold tabular">{groupDigits(o.total)}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
