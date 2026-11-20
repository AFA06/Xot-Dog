/**
 * Phase 2 data source: FastAPI + PostgreSQL (see backend/).
 * The server speaks camelCase JSON in the same shapes as src/domain/types.ts;
 * this adapter only turns `null` optionals into `undefined` and maps requests.
 */
import type { Branch, Catalog, ModifierGroup, Order, Product, Staff } from '@/domain/types'
import { cartTotals } from '@/lib/cart'
import type { AuthSession, DashboardData, DataSource, NewOrderInput } from '@/services/types'
import { createApiClient } from './client'

type Nullable<T> = { [K in keyof T]: T[K] | null }

const opt = <T,>(v: T | null | undefined): T | undefined => (v === null ? undefined : v)

function normProduct(p: Nullable<Product>): Product {
  return { ...(p as Product), description: opt(p.description) }
}

function normGroup(g: Nullable<ModifierGroup>): ModifierGroup {
  return { ...(g as ModifierGroup), max: opt(g.max), defaultOptionId: opt(g.defaultOptionId) }
}

type RawOrder = Omit<Order, 'payment' | 'fiscal'> & {
  payment: Nullable<Order['payment']>
  fiscal: Nullable<Order['fiscal']>
}

function normOrder(o: RawOrder): Order {
  return {
    ...o,
    payment: { ...(o.payment as Order['payment']), tendered: opt(o.payment.tendered), change: opt(o.payment.change) },
    fiscal: { status: o.fiscal.status as Order['fiscal']['status'], receiptId: opt(o.fiscal.receiptId), qrUrl: opt(o.fiscal.qrUrl) },
  }
}

interface DirectoryEntry {
  id: string
  name: string
  role: Staff['role']
  branchId: string | null
  demoPin: string | null
}

interface TokenOut {
  accessToken: string
  expiresAt: string
  user: Staff
  branchId: string | null
}

function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function createApiDataSource(baseUrl: string): DataSource {
  const request = createApiClient(baseUrl)

  return {
    kind: 'api',
    requiresAuth: true,
    auth: {
      async directory() {
        const people = await request<DirectoryEntry[]>('/auth/directory')
        return people.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          branchId: p.branchId,
          pin: p.demoPin ?? '',
          active: true,
          phone: '',
        }))
      },
      async login(staffId, pin, branchId): Promise<AuthSession> {
        const r = await request<TokenOut>('/auth/login', {
          method: 'POST',
          body: { staffId, pin, branchId },
          skipAuthHandling: true,
        })
        return { token: r.accessToken, staffId: r.user.id, role: r.user.role, branchId: r.branchId, expiresAt: r.expiresAt }
      },
    },
    branches: {
      list: () => request<Branch[]>('/branches'),
    },
    catalog: {
      async get(): Promise<Catalog> {
        const c = await request<{ categories: Catalog['categories']; products: Nullable<Product>[]; modifierGroups: Nullable<ModifierGroup>[] }>(
          '/catalog',
        )
        return { categories: c.categories, products: c.products.map(normProduct), modifierGroups: c.modifierGroups.map(normGroup) }
      },
      async saveProduct(product) {
        const saved = await request<Nullable<Product>>(`/products/${encodeURIComponent(product.id)}`, {
          method: 'PUT',
          body: product,
        })
        return normProduct(saved)
      },
    },
    staff: {
      list: () => request<Staff[]>('/staff'),
      save: (member) =>
        request<Staff>(`/staff/${encodeURIComponent(member.id)}`, {
          method: 'PUT',
          body: { name: member.name, role: member.role, branchId: member.branchId, pin: member.pin, active: member.active, phone: member.phone },
        }),
    },
    orders: {
      async list(query = {}) {
        const rows = await request<RawOrder[]>('/orders', {
          query: { branchId: query.branchIds, from: query.from, to: query.to },
        })
        return rows.map(normOrder)
      },
      async create(input: NewOrderInput) {
        const body = {
          branchId: input.branchId,
          type: input.type,
          paymentMethod: input.paymentMethod,
          tendered: input.tendered,
          // Server recomputes everything; this only detects a stale catalog on the POS.
          expectedTotal: cartTotals(input.lines).total,
          lines: input.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            modifiers: l.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })),
          })),
        }
        const o = await request<RawOrder>('/orders', {
          method: 'POST',
          body,
          idempotencyKey: input.idempotencyKey ?? newKey(),
        })
        return normOrder(o)
      },
      async registerReprint(orderId) {
        return normOrder(await request<RawOrder>(`/orders/${encodeURIComponent(orderId)}/reprints`, { method: 'POST' }))
      },
    },
    analytics: {
      dashboard: (q) =>
        request<DashboardData>('/analytics/dashboard', {
          query: {
            branchId: q.branchIds,
            from: q.from,
            to: q.to,
            compareFrom: q.compareFrom,
            compareTo: q.compareTo,
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
    },
  }
}
