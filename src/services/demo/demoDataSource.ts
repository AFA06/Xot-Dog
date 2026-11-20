/**
 * Phase 1 data source: everything runs in the browser.
 *  - Seed history is generated deterministically (fictional).
 *  - Orders created on the POS, product and staff edits are kept in localStorage.
 */
import type { Catalog, Order, OrderLine, Product, Staff } from '@/domain/types'
import { DEMO_BRANCHES, DEMO_CATALOG } from '@/data/demo/catalog'
import { DEMO_STAFF } from '@/data/demo/staff'
import { generateDemoOrders } from '@/data/demo/orders'
import { cartTotals, lineTotal, unitPrice } from '@/lib/cart'
import { bestsellers, byHour, categoryRevenue, filterOrders, revenueByDay, staffStats, summarize } from '@/lib/reports'
import { ApiError } from '@/services/api/client'
import { demoPaymentRecorder } from '@/services/payment'
import type { DashboardData, DataSource, NewOrderInput, OrderQuery } from '@/services/types'
import { clearDemoStorage, readJson, writeJson } from './storage'

const K_ORDERS = 'orders'
const K_ORDER_PATCHES = 'orderPatches'
const K_PRODUCTS = 'products'
const K_STAFF = 'staff'

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createDemoDataSource(now: () => Date = () => new Date()): DataSource {
  let products: Product[] = readJson<Product[]>(K_PRODUCTS, DEMO_CATALOG.products)
  let staff: Staff[] = readJson<Staff[]>(K_STAFF, DEMO_STAFF)
  let localOrders: Order[] = readJson<Order[]>(K_ORDERS, [])
  let patches: Record<string, Partial<Order>> = readJson(K_ORDER_PATCHES, {})
  let seed: Order[] = generateDemoOrders(DEMO_CATALOG, DEMO_STAFF, now())

  const all = (): Order[] => {
    const merged = [...seed, ...localOrders].map((o) => (patches[o.id] ? { ...o, ...patches[o.id] } : o))
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const catalog = (): Catalog => ({ ...DEMO_CATALOG, products })

  return {
    kind: 'demo',
    requiresAuth: false,
    auth: {
      directory: async () => staff.filter((s) => s.active),
      async login(staffId, pin, branchId) {
        const member = staff.find((s) => s.id === staffId && s.active)
        if (!member || member.pin !== pin) throw new ApiError(401, 'wrong_pin', 'Invalid staff or PIN')
        return { token: 'demo', staffId, role: member.role, branchId, expiresAt: new Date(now().getTime() + 12 * 3600_000).toISOString() }
      },
    },
    analytics: {
      async dashboard(q): Promise<DashboardData> {
        const orders = filterOrders(all(), { from: q.from, to: q.to }, q.branchIds)
        const previous = filterOrders(all(), { from: q.compareFrom, to: q.compareTo }, q.branchIds)
        return {
          summary: summarize(orders),
          previous: summarize(previous),
          perBranch: q.branchIds.map((b) => ({ branchId: b, summary: summarize(orders.filter((o) => o.branchId === b)) })),
          daily: revenueByDay(orders, { from: q.from, to: q.to }, q.branchIds),
          hourly: byHour(orders, q.branchIds),
          bestsellersByQuantity: bestsellers(orders, 'quantity', 8),
          bestsellersByRevenue: bestsellers(orders, 'revenue', 8),
          categoryRevenue: categoryRevenue(orders, products),
          staff: [...staffStats(orders)].map(([staffId, v]) => ({ staffId, ...v })),
        }
      },
    },
    branches: { list: async () => DEMO_BRANCHES },
    catalog: {
      get: async () => catalog(),
      async saveProduct(product) {
        const exists = products.some((p) => p.id === product.id)
        products = exists ? products.map((p) => (p.id === product.id ? product : p)) : [...products, product]
        writeJson(K_PRODUCTS, products)
        return product
      },
    },
    staff: {
      list: async () => staff,
      async save(input) {
        const prev = staff.find((s) => s.id === input.id)
        // Empty PIN = keep the current one (same contract as the API).
        const member = input.pin ? input : { ...input, pin: prev?.pin ?? '' }
        if (!member.pin) throw new Error('A 4-digit PIN is required for new staff')
        const exists = !!prev
        staff = exists ? staff.map((s) => (s.id === member.id ? member : s)) : [...staff, member]
        writeJson(K_STAFF, staff)
        return member
      },
    },
    orders: {
      async list(query: OrderQuery = {}) {
        return all().filter(
          (o) =>
            (!query.branchIds || query.branchIds.includes(o.branchId)) &&
            (!query.from || o.createdAt >= query.from) &&
            (!query.to || o.createdAt < query.to),
        )
      },
      async create(input: NewOrderInput) {
        if (!input.lines.length) throw new Error('Cart is empty')
        const branch = DEMO_BRANCHES.find((b) => b.id === input.branchId)
        if (!branch) throw new Error(`Unknown branch ${input.branchId}`)
        const createdAt = now()
        const todayCount = all().filter(
          (o) => o.branchId === branch.id && sameLocalDay(new Date(o.createdAt), createdAt),
        ).length
        const totals = cartTotals(input.lines)
        const lines: OrderLine[] = input.lines.map((l, i) => ({
          id: `l${i}`,
          productId: l.productId,
          name: l.name,
          unitPrice: unitPrice(l),
          quantity: l.quantity,
          modifiers: l.modifiers,
          lineTotal: lineTotal(l),
        }))
        const order: Order = {
          id: uid(),
          number: `${branch.ticketPrefix}-${(todayCount + 1).toString().padStart(4, '0')}`,
          branchId: branch.id,
          cashierId: input.cashierId,
          createdAt: createdAt.toISOString(),
          type: input.type,
          lines,
          subtotal: totals.subtotal,
          discount: totals.discount,
          total: totals.total,
          payment: demoPaymentRecorder.record(input.paymentMethod, totals.total, input.tendered),
          fiscal: { status: 'not_integrated' },
          status: 'completed',
          printCount: 0,
          isDemo: true,
        }
        localOrders = [...localOrders, order]
        writeJson(K_ORDERS, localOrders)
        return order
      },
      async registerReprint(orderId) {
        const order = all().find((o) => o.id === orderId)
        if (!order) throw new Error('Order not found')
        const next = { printCount: order.printCount + 1 }
        patches = { ...patches, [orderId]: { ...patches[orderId], ...next } }
        writeJson(K_ORDER_PATCHES, patches)
        return { ...order, ...next }
      },
    },
    async reset() {
      clearDemoStorage()
      products = DEMO_CATALOG.products
      staff = DEMO_STAFF
      localOrders = []
      patches = {}
      seed = generateDemoOrders(DEMO_CATALOG, DEMO_STAFF, now())
    },
  }
}
