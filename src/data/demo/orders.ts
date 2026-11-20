/**
 * ⚠️ FICTIONAL DEMO ORDER HISTORY.
 * Deterministically generated (seeded) sales so the admin dashboard has
 * something meaningful to show. Not real sales figures.
 */
import type { Catalog, Order, OrderLine, PaymentMethod, Staff } from '@/domain/types'
import { addToCart, lineTotal, quickCashOptions, resolveModifiers, unitPrice, type ModifierSelection } from '@/lib/cart'
import { createRng, type Rng } from '@/lib/random'
import { DEMO_BRANCHES } from './catalog'

export const DEMO_HISTORY_DAYS = 60

/** Relative order volume per hour of day (09:00–23:00 open). */
const HOUR_WEIGHTS: Record<number, number> = {
  9: 2, 10: 3, 11: 5, 12: 10, 13: 11, 14: 7, 15: 4, 16: 4, 17: 6, 18: 9, 19: 11, 20: 10, 21: 7, 22: 4,
}

const BRANCH_BASE: Record<string, number> = { chilonzor: 92, yunusobod: 74 }

const POPULARITY: Record<string, number> = {
  'hd-classic': 22, 'hd-double': 9, 'hd-cheese': 12, 'hd-spicy': 8, 'hd-french': 7, 'hd-chicken': 6, 'hd-kids': 3,
  'bg-classic': 7, 'bg-cheese': 10, 'bg-double': 5, 'bg-chicken': 6, 'bg-bbq': 4,
  'sd-fries': 16, 'sd-wedges': 6, 'sd-rings': 4, 'sd-nuggets': 6, 'sd-salad': 2,
  'dr-cola': 15, 'dr-lemonade': 6, 'dr-ayran': 7, 'dr-juice': 4, 'dr-water': 5, 'dr-tea': 4, 'dr-coffee': 3,
  'cb-hotdog': 12, 'cb-burger': 8, 'cb-double': 4, 'cb-kids': 2,
}

function pad(n: number, len = 4) {
  return n.toString().padStart(len, '0')
}

function randomSelection(rng: Rng, productGroupIds: string[], catalog: Catalog): ModifierSelection {
  const sel: ModifierSelection = {}
  for (const gid of productGroupIds) {
    const g = catalog.modifierGroups.find((x) => x.id === gid)
    if (!g) continue
    if (g.selection === 'single') {
      if (g.required) {
        sel[gid] = [rng.chance(0.7) && g.defaultOptionId ? g.defaultOptionId : g.options[rng.int(0, g.options.length - 1)].id]
      } else if (rng.chance(0.15)) {
        sel[gid] = [g.options[rng.int(0, g.options.length - 1)].id]
      }
    } else {
      const picks = g.options.filter(() => rng.chance(gid === 'sauces' ? 0.35 : 0.1)).map((o) => o.id)
      sel[gid] = g.max ? picks.slice(0, g.max) : picks
    }
  }
  return sel
}

export function generateDemoOrders(catalog: Catalog, staff: Staff[], now = new Date(), seed = 20261120): Order[] {
  const rng = createRng(seed)
  const orders: Order[] = []
  const products = catalog.products
  const weights = products.map((p) => POPULARITY[p.id] ?? 1)
  const hours = Object.keys(HOUR_WEIGHTS).map(Number)
  const hourWeights = hours.map((h) => HOUR_WEIGHTS[h])

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (let d = DEMO_HISTORY_DAYS - 1; d >= 0; d--) {
    const day = new Date(today)
    day.setDate(today.getDate() - d)
    const dow = day.getDay()
    const weekend = dow === 0 || dow === 6
    const trend = 1 + (DEMO_HISTORY_DAYS - d) * 0.003

    for (const branch of DEMO_BRANCHES) {
      const cashiers = staff.filter((s) => s.branchId === branch.id && s.role === 'cashier')
      const target = Math.round(BRANCH_BASE[branch.id] * (weekend ? 1.28 : 1) * trend * (0.85 + rng.next() * 0.3))
      const stamps: Date[] = []
      for (let i = 0; i < target; i++) {
        const h = rng.weighted(hours, hourWeights)
        const t = new Date(day)
        t.setHours(h, rng.int(0, 59), rng.int(0, 59), 0)
        if (t <= now) stamps.push(t)
      }
      stamps.sort((a, b) => a.getTime() - b.getTime())

      stamps.forEach((createdAt, idx) => {
        let cart = [] as ReturnType<typeof addToCart>
        const distinct = rng.weighted([1, 2, 3, 4], [30, 38, 22, 10])
        for (let k = 0; k < distinct; k++) {
          const product = rng.weighted(products, weights)
          const mods = resolveModifiers(product, catalog.modifierGroups, randomSelection(rng, product.modifierGroupIds, catalog))
          cart = addToCart(cart, product, mods, rng.weighted([1, 2, 3], [78, 18, 4]))
        }
        const lines: OrderLine[] = cart.map((l, i) => ({
          id: `l${i}`,
          productId: l.productId,
          name: l.name,
          unitPrice: unitPrice(l),
          quantity: l.quantity,
          modifiers: l.modifiers,
          lineTotal: lineTotal(l),
        }))
        const total = lines.reduce((s, l) => s + l.lineTotal, 0)
        const method: PaymentMethod = rng.chance(0.56) ? 'card' : 'cash'
        let tendered: number | undefined
        if (method === 'cash') {
          const opts = quickCashOptions(total)
          tendered = opts[rng.int(0, Math.min(2, opts.length - 1))]
        }
        const cashier = cashiers[(idx + d) % cashiers.length]
        orders.push({
          id: `demo-${branch.code}-${d}-${idx}`,
          number: `${branch.ticketPrefix}-${pad(idx + 1)}`,
          branchId: branch.id,
          cashierId: cashier.id,
          createdAt: createdAt.toISOString(),
          type: rng.chance(0.62) ? 'takeaway' : 'dine_in',
          lines,
          subtotal: total,
          discount: 0,
          total,
          payment: {
            method,
            amount: total,
            tendered,
            change: tendered !== undefined ? tendered - total : undefined,
            status: 'recorded_demo',
          },
          fiscal: { status: 'not_integrated' },
          status: rng.chance(0.012) ? 'voided' : 'completed',
          printCount: 1,
          isDemo: true,
        })
      })
    }
  }
  return orders
}
