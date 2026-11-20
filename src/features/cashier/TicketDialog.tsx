import { useState } from 'react'
import { CheckCircle2, Loader2, Printer, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TicketView } from '@/components/common/TicketView'
import { useI18n } from '@/i18n/useI18n'
import { buildTicket, simulatedPrinter } from '@/services/printing'
import { useApp } from '@/store/appStore'
import { toast } from '@/store/toastStore'

/** Ticket preview + print/reprint *simulation*. Nothing is sent to a printer in Phase 1. */
export function TicketDialog({ orderId, isNew, onClose }: { orderId: string | null; isNew: boolean; onClose(): void }) {
  const { t, locale } = useI18n()
  const order = useApp((s) => s.orders.find((o) => o.id === orderId))
  const branches = useApp((s) => s.branches)
  const staff = useApp((s) => s.staff)
  const registerReprint = useApp((s) => s.registerReprint)
  const [busy, setBusy] = useState(false)

  if (!order) return null
  const branch = branches.find((b) => b.id === order.branchId)
  const cashier = staff.find((s) => s.id === order.cashierId)
  const isCopy = order.printCount > 0
  const ticket = buildTicket(order, branch, cashier, locale, { reprint: isCopy })

  const print = async () => {
    setBusy(true)
    try {
      await simulatedPrinter.print(ticket, { orderId: order.id, copy: isCopy })
      await registerReprint(order.id)
      toast(t('pos.printed'), 'info')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[94dvh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isNew && <CheckCircle2 className="size-6 text-success" />}
            {isNew ? `${t('pos.orderCreated')} · ${order.number}` : `${t('pos.ticketPreview')} · ${order.number}`}
          </DialogTitle>
          <DialogDescription>
            {t('fiscal.not_integrated')} · {t('pos.printCount')}: {order.printCount} {t('pos.times')}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/70 px-4 py-6">
          <TicketView ticket={ticket} />
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <button
            onClick={print}
            disabled={busy}
            className="flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-ink text-[15px] font-semibold"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Printer className="size-5" />}
            {isCopy ? t('pos.reprint') : t('pos.print')}
          </button>
          <button
            onClick={onClose}
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground"
          >
            {isNew && <Plus className="size-5" />}
            {isNew ? t('pos.newOrder') : t('admin.cancel')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
