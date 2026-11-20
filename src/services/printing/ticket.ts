/**
 * Builds a device-independent ticket document. The on-screen preview renders
 * it today; a future local printer agent can turn the same structure into
 * ESC/POS bytes for an 80 mm thermal printer.
 */
import type { Branch, Locale, Order, Staff } from '@/domain/types'
import { formatUZS, groupDigits } from '@/lib/money'
import { translate } from '@/i18n/dictionaries'

export type TicketRow =
  | { kind: 'center'; text: string; bold?: boolean; size?: 'normal' | 'large' }
  | { kind: 'pair'; left: string; right: string; bold?: boolean }
  | { kind: 'item'; name: string; qty: number; unit: string; total: string; mods: string[] }
  | { kind: 'divider' }
  | { kind: 'notice'; text: string }

export interface TicketDocument {
  widthMm: 80
  rows: TicketRow[]
}

export function formatTicketDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function buildTicket(
  order: Order,
  branch: Branch | undefined,
  cashier: Staff | undefined,
  locale: Locale,
  opts: { reprint?: boolean } = {},
): TicketDocument {
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k)
  const rows: TicketRow[] = [
    { kind: 'notice', text: t('ticket.demoNotice') },
    { kind: 'center', text: 'XOT-DOG', bold: true, size: 'large' },
    { kind: 'center', text: branch ? branch.name[locale] : order.branchId },
  ]
  if (branch) rows.push({ kind: 'center', text: branch.address[locale] })
  if (opts.reprint) rows.push({ kind: 'center', text: `*** ${t('ticket.copy')} ***`, bold: true })
  rows.push(
    { kind: 'divider' },
    { kind: 'center', text: `${t('ticket.order')} ${order.number}`, bold: true, size: 'large' },
    { kind: 'center', text: order.type === 'dine_in' ? t('pos.dineIn') : t('pos.takeaway') },
    { kind: 'pair', left: t('ticket.date'), right: formatTicketDate(order.createdAt) },
    { kind: 'pair', left: t('ticket.cashier'), right: cashier?.name ?? '—' },
    { kind: 'divider' },
  )
  for (const l of order.lines) {
    rows.push({
      kind: 'item',
      name: l.name[locale],
      qty: l.quantity,
      unit: groupDigits(l.unitPrice),
      total: groupDigits(l.lineTotal),
      mods: l.modifiers.map((m) => (m.priceDelta ? `${m.name[locale]} (${m.priceDelta > 0 ? '+' : ''}${groupDigits(m.priceDelta)})` : m.name[locale])),
    })
  }
  rows.push({ kind: 'divider' })
  if (order.discount) rows.push({ kind: 'pair', left: t('pos.discount'), right: `-${formatUZS(order.discount, locale)}` })
  rows.push({ kind: 'pair', left: t('pos.total'), right: formatUZS(order.total, locale), bold: true })
  rows.push({
    kind: 'pair',
    left: t('ticket.payment'),
    right: order.payment.method === 'cash' ? t('pos.cash') : t('pos.card'),
  })
  if (order.payment.method === 'cash' && order.payment.tendered !== undefined) {
    rows.push({ kind: 'pair', left: t('pos.tendered'), right: formatUZS(order.payment.tendered, locale) })
    rows.push({ kind: 'pair', left: t('pos.change'), right: formatUZS(order.payment.change ?? 0, locale) })
  }
  if (order.status === 'voided') rows.push({ kind: 'center', text: `*** ${t('status.voided')} ***`, bold: true })
  rows.push(
    { kind: 'divider' },
    { kind: 'notice', text: t('ticket.notFiscal') },
    { kind: 'center', text: t('ticket.thanks') },
  )
  return { widthMm: 80, rows }
}
