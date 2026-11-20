import { useMemo, useState } from 'react'
import { Banknote, ChevronLeft, ChevronRight, CreditCard, Search } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TicketView } from '@/components/common/TicketView'
import type { Order } from '@/domain/types'
import { useI18n } from '@/i18n/useI18n'
import { branchColor, shortBranchName } from '@/lib/branch'
import { groupDigits } from '@/lib/money'
import { summarize } from '@/lib/reports'
import { cn } from '@/lib/utils'
import { buildTicket, formatTicketDate } from '@/services/printing'
import { useApp } from '@/store/appStore'
import { useFilteredOrders } from '../adminFilters'

const PAGE = 25

export function OrdersPage() {
  const { t, money, locale } = useI18n()
  const branches = useApp((s) => s.branches)
  const staff = useApp((s) => s.staff)
  const { orders } = useFilteredOrders()
  const [q, setQ] = useState('')
  const [method, setMethod] = useState<'all' | 'cash' | 'card'>('all')
  const [status, setStatus] = useState<'all' | 'completed' | 'voided'>('all')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Order | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return orders.filter(
      (o) =>
        (method === 'all' || o.payment.method === method) &&
        (status === 'all' || o.status === status) &&
        (!needle || o.number.toLowerCase().includes(needle)),
    )
  }, [orders, q, method, status])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const current = Math.min(page, pages - 1)
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE)
  const sum = summarize(filtered)
  const cashierName = (id: string) => staff.find((s) => s.id === id)?.name ?? '—'
  const branchOf = (id: string) => branches.find((b) => b.id === id)

  const resetPage = () => setPage(0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => (setQ(e.target.value), resetPage())}
            placeholder={t('admin.searchOrder')}
            className="h-9 w-full rounded-lg border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </div>
        <Select value={method} onValueChange={(v) => (setMethod(v as typeof method), resetPage())}>
          <SelectTrigger className="h-9 w-36 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.payment')}: {t('admin.all')}</SelectItem>
            <SelectItem value="cash">{t('pos.cash')}</SelectItem>
            <SelectItem value="card">{t('pos.card')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => (setStatus(v as typeof status), resetPage())}>
          <SelectTrigger className="h-9 w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.status')}: {t('admin.all')}</SelectItem>
            <SelectItem value="completed">{t('status.completed')}</SelectItem>
            <SelectItem value="voided">{t('status.voided')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground tabular">
          {groupDigits(filtered.length)} · {money(sum.revenue)}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t('admin.number')}</th>
              <th className="px-4 py-2.5 font-medium">{t('admin.time')}</th>
              <th className="px-4 py-2.5 font-medium">{t('admin.branch')}</th>
              <th className="px-4 py-2.5 font-medium">{t('admin.cashier')}</th>
              <th className="px-4 py-2.5 font-medium">{t('admin.items')}</th>
              <th className="px-4 py-2.5 font-medium">{t('admin.payment')}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t('admin.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="cursor-pointer hover:bg-muted/50">
                <td className="px-4 py-2.5 font-semibold tabular">
                  <span className={cn(o.status === 'voided' && 'text-muted-foreground line-through')}>{o.number}</span>
                  {o.status === 'voided' && <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">{t('status.voided')}</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground tabular">{formatTicketDate(o.createdAt)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: branchColor(branches, o.branchId) }} />
                    {shortBranchName(branchOf(o.branchId), locale)}
                  </span>
                </td>
                <td className="px-4 py-2.5">{cashierName(o.cashierId)}</td>
                <td className="max-w-64 truncate px-4 py-2.5 text-muted-foreground">
                  {o.lines.map((l) => `${l.quantity}× ${l.name[locale]}`).join(', ')}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    {o.payment.method === 'cash' ? <Banknote className="size-4" /> : <CreditCard className="size-4" />}
                    {o.payment.method === 'cash' ? t('pos.cash') : t('pos.card')}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular">{groupDigits(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">{t('admin.noData')}</p>}
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((o) => (
          <li key={o.id}>
            <button onClick={() => setSelected(o)} className="w-full rounded-xl border bg-card p-3 text-left">
              <div className="flex items-center gap-2">
                <span className={cn('font-semibold tabular', o.status === 'voided' && 'text-muted-foreground line-through')}>{o.number}</span>
                <span className="size-2 rounded-full" style={{ background: branchColor(branches, o.branchId) }} />
                <span className="text-xs text-muted-foreground">{shortBranchName(branchOf(o.branchId), locale)}</span>
                <span className="ml-auto font-semibold tabular">{groupDigits(o.total)}</span>
              </div>
              <div className="mt-1 truncate text-sm text-muted-foreground">{o.lines.map((l) => `${l.quantity}× ${l.name[locale]}`).join(', ')}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground tabular">
                {o.payment.method === 'cash' ? <Banknote className="size-3.5" /> : <CreditCard className="size-3.5" />}
                {formatTicketDate(o.createdAt)} · {cashierName(o.cashierId)}
              </div>
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">{t('admin.noData')}</p>}
      </ul>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground tabular">
          {t('admin.showing')} {filtered.length ? current * PAGE + 1 : 0}–{Math.min(filtered.length, (current + 1) * PAGE)} / {groupDigits(filtered.length)}
        </span>
        <div className="flex gap-2">
          <button disabled={current === 0} onClick={() => setPage(current - 1)} className="flex h-9 items-center gap-1 rounded-lg border bg-card px-3 disabled:opacity-40">
            <ChevronLeft className="size-4" /> <span className="hidden sm:inline">{t('admin.prev')}</span>
          </button>
          <span className="grid h-9 place-items-center px-1 tabular">
            {current + 1} / {pages}
          </span>
          <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="flex h-9 items-center gap-1 rounded-lg border bg-card px-3 disabled:opacity-40">
            <span className="hidden sm:inline">{t('admin.next')}</span> <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="border-b p-5">
                <SheetTitle>
                  {t('admin.orderDetails')} · {selected.number}
                </SheetTitle>
                <SheetDescription>
                  {t('fiscal.not_integrated')} · {t('pos.printCount')}: {selected.printCount}
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/70 px-4 py-6">
                <TicketView
                  ticket={buildTicket(selected, branchOf(selected.branchId), staff.find((s) => s.id === selected.cashierId), locale)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
