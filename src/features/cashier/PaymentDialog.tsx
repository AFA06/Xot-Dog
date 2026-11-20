import { useEffect, useRef, useState } from 'react'
import { Banknote, CreditCard, Info, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NumPad } from '@/components/common/NumPad'
import type { Order } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { cartTotals, computeChange, quickCashOptions } from '@/lib/cart'
import { errorText } from '@/lib/errors'
import { ApiError } from '@/services'
import { groupDigits } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/appStore'
import { toast } from '@/store/toastStore'
import { usePos } from './posStore'

function newCheckoutKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function PaymentDialog({
  open,
  onClose,
  branchId,
  cashierId,
  onCreated,
}: {
  open: boolean
  onClose(): void
  branchId: string
  cashierId: string
  onCreated(o: Order): void
}) {
  const { t, money } = useI18n()
  const { cart, payment, orderType, clear, reprice } = usePos()
  const createOrder = useApp((s) => s.createOrder)
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const { total, itemCount } = cartTotals(cart)
  // One key per checkout: if the network drops after the server saved the order,
  // pressing confirm again returns that same order instead of creating a duplicate.
  const idempotencyKey = useRef('')

  useEffect(() => {
    if (open) {
      setEntry('')
      idempotencyKey.current = newCheckoutKey()
    }
  }, [open])

  const tendered = entry ? Number(entry) : total
  const change = computeChange(total, tendered)
  const canConfirm = payment === 'card' || change !== null

  const confirm = async () => {
    if (!canConfirm || busy) return
    setBusy(true)
    try {
      const order = await createOrder({
        branchId,
        cashierId,
        type: orderType,
        lines: cart,
        paymentMethod: payment,
        tendered: payment === 'cash' ? tendered : undefined,
        idempotencyKey: idempotencyKey.current,
      })
      clear()
      toast(`${t('pos.orderCreated')}: ${order.number}`, 'success')
      onCreated(order)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'price_changed') {
        reprice(useApp.getState().catalog)
        idempotencyKey.current = newCheckoutKey()
      }
      toast(errorText(e, t), 'warning')
    } finally {
      setBusy(false)
    }
  }

  const Icon = payment === 'cash' ? Banknote : CreditCard

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Icon className="size-6" /> {payment === 'cash' ? t('pos.cash') : t('pos.card')}
          </DialogTitle>
          <DialogDescription>
            {itemCount} {t('pos.items')} · {orderType === 'dine_in' ? t('pos.dineIn') : t('pos.takeaway')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          <div className="flex items-baseline justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-muted-foreground">{t('pos.total')}</span>
            <span className="text-3xl font-extrabold tabular">{money(total)}</span>
          </div>

          {payment === 'cash' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-3">
                <div className="rounded-xl border-2 border-ink px-4 py-2">
                  <div className="text-xs text-muted-foreground">{t('pos.tendered')}</div>
                  <div className={cn('text-2xl font-bold tabular', !entry && 'text-muted-foreground')}>
                    {groupDigits(tendered)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickCashOptions(total).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEntry(String(v))}
                      className={cn(
                        'h-12 rounded-xl border bg-background text-sm font-semibold tabular',
                        tendered === v && 'border-ink bg-ink/5',
                      )}
                    >
                      {v === total ? t('pos.exact') : groupDigits(v)}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    'rounded-xl px-4 py-3',
                    change === null ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-[oklch(0.4_0.12_150)]',
                  )}
                >
                  <div className="text-xs font-medium">{change === null ? t('pos.insufficient') : t('pos.change')}</div>
                  <div className="text-2xl font-bold tabular">{change === null ? '—' : money(change)}</div>
                </div>
              </div>
              <NumPad
                size="md"
                className="w-full sm:w-60"
                onDigit={(d) => setEntry((e) => (e.length >= 9 ? e : (e + d).replace(/^0+/, '')))}
                onBackspace={() => setEntry((e) => e.slice(0, -1))}
                extraKey={{ label: '000', onPress: () => setEntry((e) => (e && e.length <= 6 ? e + '000' : e)) }}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="size-5 text-warning" /> {t('pos.cardDemoTitle')}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('pos.cardDemoText')}</p>
            </div>
          )}

          {payment === 'cash' && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" /> {t('pos.cashDemoText')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 border-t p-4">
          <button onClick={onClose} disabled={busy} className="h-14 rounded-xl border px-6 font-semibold">
            {t('pos.cancel')}
          </button>
          <button
            onClick={confirm}
            disabled={!canConfirm || busy}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-40"
          >
            {busy && <Loader2 className="size-5 animate-spin" />}
            {t('pos.confirm')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
