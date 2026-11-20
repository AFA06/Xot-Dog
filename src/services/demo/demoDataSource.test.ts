import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_CATALOG } from '@/data/demo/catalog'
import { addToCart } from '@/lib/cart'
import { buildTicket } from '@/services/printing'
import { createDemoDataSource } from './demoDataSource'

const hd = DEMO_CATALOG.products.find((p) => p.id === 'hd-classic')!

describe('demo data source', () => {
  beforeEach(() => localStorage.clear())

  it('creates an order recorded as demo, not fiscalized, and persists it', async () => {
    const ds = createDemoDataSource()
    const order = await ds.orders.create({
      branchId: 'chilonzor',
      cashierId: 'st-c1',
      type: 'takeaway',
      lines: addToCart([], hd, [], 2),
      paymentMethod: 'cash',
      tendered: 50000,
    })
    expect(order.total).toBe(36000)
    expect(order.payment).toMatchObject({ method: 'cash', tendered: 50000, change: 14000, status: 'recorded_demo' })
    expect(order.fiscal.status).toBe('not_integrated')
    expect(order.number).toMatch(/^C-\d{4}$/)

    const reloaded = createDemoDataSource()
    const list = await reloaded.orders.list({ branchIds: ['chilonzor'] })
    expect(list.some((o) => o.id === order.id)).toBe(true)
  })

  it('rejects insufficient cash and empty carts', async () => {
    const ds = createDemoDataSource()
    await expect(
      ds.orders.create({ branchId: 'chilonzor', cashierId: 'st-c1', type: 'takeaway', lines: addToCart([], hd), paymentMethod: 'cash', tendered: 1000 }),
    ).rejects.toThrow()
    await expect(
      ds.orders.create({ branchId: 'chilonzor', cashierId: 'st-c1', type: 'takeaway', lines: [], paymentMethod: 'card' }),
    ).rejects.toThrow()
  })

  it('counts reprints and the ticket is clearly marked non-fiscal copy', async () => {
    const ds = createDemoDataSource()
    const order = await ds.orders.create({ branchId: 'yunusobod', cashierId: 'st-y1', type: 'dine_in', lines: addToCart([], hd), paymentMethod: 'card' })
    const printed = await ds.orders.registerReprint(order.id)
    expect(printed.printCount).toBe(1)
    const ticket = buildTicket(printed, undefined, undefined, 'ru', { reprint: true })
    const text = JSON.stringify(ticket)
    expect(text).toContain('НЕ ФИСКАЛЬНЫЙ ЧЕК')
    expect(text).toContain('КОПИЯ')
    expect(text).toContain('ДЕМО')
  })

  it('product edits persist and reset restores the demo catalog', async () => {
    const ds = createDemoDataSource()
    await ds.catalog.saveProduct({ ...hd, price: 21000 })
    expect((await createDemoDataSource().catalog.get()).products.find((p) => p.id === hd.id)?.price).toBe(21000)
    await ds.reset?.()
    expect((await ds.catalog.get()).products.find((p) => p.id === hd.id)?.price).toBe(18000)
  })
})
