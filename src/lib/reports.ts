/**
 * Reporting aggregations over orders. Pure functions so the same numbers can
 * later be cross-checked against SQL reports from the backend.
 * Only `completed` orders count toward sales figures.
 */
import type { CategoryId, DateRange, Order, Product } from '@/domain/types'
import { daysInRange, toDateKey } from './dates'

export interface SalesSummary {
  revenue: number
  orders: number
  avgTicket: number
  itemsSold: number
  cashRevenue: number
  cardRevenue: number
  cashOrders: number
  cardOrders: number
  voided: number
}

export function inRange(o: Order, range: DateRange): boolean {
  return o.createdAt >= range.from && o.createdAt < range.to
}

export function filterOrders(orders: Order[], range: DateRange, branchIds?: string[]): Order[] {
  return orders.filter((o) => inRange(o, range) && (!branchIds || branchIds.includes(o.branchId)))
}

export function summarize(orders: Order[]): SalesSummary {
  const s: SalesSummary = {
    revenue: 0, orders: 0, avgTicket: 0, itemsSold: 0,
    cashRevenue: 0, cardRevenue: 0, cashOrders: 0, cardOrders: 0, voided: 0,
  }
  for (const o of orders) {
    if (o.status !== 'completed') {
      s.voided++
      continue
    }
    s.revenue += o.total
    s.orders++
    s.itemsSold += o.lines.reduce((n, l) => n + l.quantity, 0)
    if (o.payment.method === 'cash') {
      s.cashRevenue += o.total
      s.cashOrders++
    } else {
      s.cardRevenue += o.total
      s.cardOrders++
    }
  }
  s.avgTicket = s.orders ? Math.round(s.revenue / s.orders) : 0
  return s
}

/** Relative change; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return (current - previous) / previous
}

export type DailyPoint = { date: string; total: number } & Record<string, number | string>

/** Revenue per local day, with one numeric column per branch id plus `total`. */
export function revenueByDay(orders: Order[], range: DateRange, branchIds: string[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>()
  for (const key of daysInRange(range)) {
    const row: DailyPoint = { date: key, total: 0 }
    for (const b of branchIds) row[b] = 0
    map.set(key, row)
  }
  for (const o of orders) {
    if (o.status !== 'completed') continue
    const row = map.get(toDateKey(new Date(o.createdAt)))
    if (!row) continue
    row[o.branchId] = ((row[o.branchId] as number) ?? 0) + o.total
    row.total += o.total
  }
  return [...map.values()]
}

export type HourlyPoint = { hour: number; orders: number; revenue: number } & Record<string, number>

/** Order count & revenue per local hour (open hours only), with per-branch order counts. */
export function byHour(orders: Order[], branchIds: string[], openFrom = 9, openTo = 23): HourlyPoint[] {
  const rows: HourlyPoint[] = []
  for (let h = openFrom; h < openTo; h++) {
    const r: HourlyPoint = { hour: h, orders: 0, revenue: 0 }
    for (const b of branchIds) r[b] = 0
    rows.push(r)
  }
  for (const o of orders) {
    if (o.status !== 'completed') continue
    const h = new Date(o.createdAt).getHours()
    const r = rows.find((x) => x.hour === h)
    if (!r) continue
    r.orders++
    r.revenue += o.total
    r[o.branchId] = (r[o.branchId] ?? 0) + 1
  }
  return rows
}

export function peakHour(rows: HourlyPoint[]): HourlyPoint | null {
  return rows.reduce<HourlyPoint | null>((best, r) => (!best || r.orders > best.orders ? r : best), null)
}

export interface ProductStat {
  productId: string
  quantity: number
  revenue: number
}

export function productStats(orders: Order[]): ProductStat[] {
  const map = new Map<string, ProductStat>()
  for (const o of orders) {
    if (o.status !== 'completed') continue
    for (const l of o.lines) {
      const s = map.get(l.productId) ?? { productId: l.productId, quantity: 0, revenue: 0 }
      s.quantity += l.quantity
      s.revenue += l.lineTotal
      map.set(l.productId, s)
    }
  }
  return [...map.values()]
}

export function bestsellers(orders: Order[], by: 'quantity' | 'revenue' = 'quantity', limit = 8): ProductStat[] {
  return productStats(orders)
    .sort((a, b) => b[by] - a[by] || a.productId.localeCompare(b.productId))
    .slice(0, limit)
}

export function categoryRevenue(orders: Order[], products: Product[]): Record<CategoryId, number> {
  const out = { hotdogs: 0, burgers: 0, sides: 0, drinks: 0, combos: 0 } as Record<CategoryId, number>
  const cat = new Map(products.map((p) => [p.id, p.categoryId]))
  for (const s of productStats(orders)) {
    const c = cat.get(s.productId)
    if (c) out[c] += s.revenue
  }
  return out
}

export function staffStats(orders: Order[]): Map<string, { orders: number; revenue: number }> {
  const m = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders) {
    if (o.status !== 'completed') continue
    const s = m.get(o.cashierId) ?? { orders: 0, revenue: 0 }
    s.orders++
    s.revenue += o.total
    m.set(o.cashierId, s)
  }
  return m
}
