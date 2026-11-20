import { describe, expect, it } from 'vitest'
import type { Order } from '@/domain/types'
import { DEMO_CATALOG } from '@/data/demo/catalog'
import { DEMO_STAFF } from '@/data/demo/staff'
import { generateDemoOrders } from '@/data/demo/orders'
import { customRange, previousRange } from './dates'
import { bestsellers, byHour, filterOrders, peakHour, percentChange, revenueByDay, summarize } from './reports'

function order(partial: Partial<Order>): Order {
  return {
    id: Math.random().toString(),
    number: 'C-0001',
    branchId: 'chilonzor',
    cashierId: 'st-c1',
    createdAt: new Date(2026, 10, 20, 12, 30).toISOString(),
    type: 'takeaway',
    lines: [{ id: 'l0', productId: 'hd-classic', name: { uz: '', ru: '' }, unitPrice: 18000, quantity: 2, modifiers: [], lineTotal: 36000 }],
    subtotal: 36000,
    discount: 0,
    total: 36000,
    payment: { method: 'cash', amount: 36000, tendered: 50000, change: 14000, status: 'recorded_demo' },
    fiscal: { status: 'not_integrated' },
    status: 'completed',
    printCount: 1,
    isDemo: true,
    ...partial,
  }
}

describe('reports', () => {
  it('summarises only completed orders', () => {
    const s = summarize([
      order({}),
      order({ total: 20000, payment: { method: 'card', amount: 20000, status: 'recorded_demo' } }),
      order({ status: 'voided', total: 99999 }),
    ])
    expect(s.revenue).toBe(56000)
    expect(s.orders).toBe(2)
    expect(s.avgTicket).toBe(28000)
    expect(s.cashRevenue).toBe(36000)
    expect(s.cardRevenue).toBe(20000)
    expect(s.voided).toBe(1)
    expect(s.itemsSold).toBe(4)
  })

  it('groups by day per branch and by hour', () => {
    const range = customRange('2026-11-19', '2026-11-20')
    const orders = [
      order({ createdAt: new Date(2026, 10, 19, 13, 5).toISOString() }),
      order({ branchId: 'yunusobod', createdAt: new Date(2026, 10, 20, 13, 50).toISOString() }),
      order({ createdAt: new Date(2026, 10, 20, 19, 0).toISOString() }),
    ]
    const days = revenueByDay(orders, range, ['chilonzor', 'yunusobod'])
    expect(days.map((d) => d.date)).toEqual(['2026-11-19', '2026-11-20'])
    expect(days[1].yunusobod).toBe(36000)
    expect(days[1].total).toBe(72000)
    const hours = byHour(orders, ['chilonzor', 'yunusobod'])
    expect(peakHour(hours)?.hour).toBe(13)
  })

  it('ranks bestsellers', () => {
    const top = bestsellers([
      order({}),
      order({ lines: [{ id: 'l', productId: 'dr-cola', name: { uz: '', ru: '' }, unitPrice: 10000, quantity: 5, modifiers: [], lineTotal: 50000 }] }),
    ])
    expect(top[0].productId).toBe('dr-cola')
    expect(bestsellers([order({})], 'revenue')[0].revenue).toBe(36000)
  })

  it('previous range has the same length and percent change handles zero baseline', () => {
    const r = customRange('2026-11-14', '2026-11-20')
    const p = previousRange(r)
    expect(new Date(r.to).getTime() - new Date(r.from).getTime()).toBe(new Date(p.to).getTime() - new Date(p.from).getTime())
    expect(percentChange(110, 100)).toBeCloseTo(0.1)
    expect(percentChange(5, 0)).toBeNull()
  })
})

describe('demo history generator', () => {
  const now = new Date(2026, 10, 20, 15, 0)
  const orders = generateDemoOrders(DEMO_CATALOG, DEMO_STAFF, now)

  it('is deterministic and never produces future or fiscalized orders', () => {
    const again = generateDemoOrders(DEMO_CATALOG, DEMO_STAFF, now)
    expect(again.length).toBe(orders.length)
    expect(again[100]).toEqual(orders[100])
    expect(orders.every((o) => new Date(o.createdAt) <= now)).toBe(true)
    expect(orders.every((o) => o.fiscal.status === 'not_integrated' && o.isDemo)).toBe(true)
    expect(orders.every((o) => o.payment.status === 'recorded_demo')).toBe(true)
  })

  it('totals are consistent with lines', () => {
    for (const o of orders.slice(0, 500)) {
      expect(o.total).toBe(o.lines.reduce((s, l) => s + l.lineTotal, 0))
      for (const l of o.lines) expect(l.lineTotal).toBe(l.unitPrice * l.quantity)
    }
  })

  it('covers both branches', () => {
    const range = customRange('2026-11-01', '2026-11-20')
    expect(filterOrders(orders, range, ['chilonzor']).length).toBeGreaterThan(100)
    expect(filterOrders(orders, range, ['yunusobod']).length).toBeGreaterThan(100)
  })
})

describe('comparison range', () => {
  it('compares only the elapsed part of an in-progress period', async () => {
    const { comparisonRange, presetRange } = await import('./dates')
    const now = new Date(2026, 10, 20, 12, 0)
    const prev = comparisonRange(presetRange('today', now), now)
    expect(new Date(prev.from)).toEqual(new Date(2026, 10, 19, 0, 0))
    expect(new Date(prev.to)).toEqual(new Date(2026, 10, 19, 12, 0))
  })
})
