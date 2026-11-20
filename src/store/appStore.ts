import { create } from 'zustand'
import type { Branch, Catalog, Order, Product, Staff } from '@/domain/types'
import { dataSource, type NewOrderInput } from '@/services'

interface AppState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  branches: Branch[]
  catalog: Catalog
  staff: Staff[]
  orders: Order[]
  init(): Promise<void>
  createOrder(input: NewOrderInput): Promise<Order>
  registerReprint(orderId: string): Promise<Order>
  saveProduct(p: Product): Promise<void>
  saveStaff(s: Staff): Promise<void>
  resetDemo(): Promise<void>
}

async function loadAll() {
  const [branches, catalog, staff, orders] = await Promise.all([
    dataSource.branches.list(),
    dataSource.catalog.get(),
    dataSource.staff.list(),
    dataSource.orders.list(),
  ])
  return { branches, catalog, staff, orders }
}

export const useApp = create<AppState>((set, get) => ({
  status: 'idle',
  branches: [],
  catalog: { categories: [], products: [], modifierGroups: [] },
  staff: [],
  orders: [],

  async init() {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    try {
      set({ ...(await loadAll()), status: 'ready' })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },

  async createOrder(input) {
    const order = await dataSource.orders.create(input)
    set((s) => ({ orders: [order, ...s.orders] }))
    return order
  },

  async registerReprint(orderId) {
    const order = await dataSource.orders.registerReprint(orderId)
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? order : o)) }))
    return order
  },

  async saveProduct(p) {
    await dataSource.catalog.saveProduct(p)
    set({ catalog: await dataSource.catalog.get() })
  },

  async saveStaff(member) {
    await dataSource.staff.save(member)
    set({ staff: await dataSource.staff.list() })
  },

  async resetDemo() {
    await dataSource.reset?.()
    set({ ...(await loadAll()), status: 'ready' })
  },
}))
