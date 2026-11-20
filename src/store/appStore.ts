import { create } from 'zustand'
import type { Branch, Catalog, Order, Product, Staff } from '@/domain/types'
import { ApiError, dataSource, type NewOrderInput, type OrderQuery } from '@/services'
import { isAdminRole, useSession } from './sessionStore'

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AppState {
  /** Public data (branches + sign-in directory). */
  status: LoadStatus
  error?: string
  /** Session data (catalog, staff, orders) — needs a signed-in user in API mode. */
  privateStatus: LoadStatus
  privateError?: string
  privateKey: string | null
  branches: Branch[]
  directory: Staff[]
  catalog: Catalog
  staff: Staff[]
  /** Orders for the window most recently requested via `loadOrders` (+ orders created since). */
  orders: Order[]
  ordersLoading: boolean
  init(): Promise<void>
  ensurePrivate(): Promise<void>
  loadOrders(query: OrderQuery): Promise<void>
  createOrder(input: NewOrderInput): Promise<Order>
  registerReprint(orderId: string): Promise<Order>
  saveProduct(p: Product): Promise<void>
  saveStaff(s: Staff): Promise<void>
  refreshCatalog(): Promise<void>
  resetDemo(): Promise<void>
}

const EMPTY_CATALOG: Catalog = { categories: [], products: [], modifierGroups: [] }
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
const sessionKey = () => (dataSource.requiresAuth ? useSession.getState().token : 'demo')

let ordersRequest = 0

async function loadPublic() {
  const [branches, directory] = await Promise.all([dataSource.branches.list(), dataSource.auth.directory()])
  return { branches, directory }
}

async function loadPrivate(directory: Staff[]) {
  const role = useSession.getState().role
  const staffPromise = dataSource.requiresAuth && !isAdminRole(role) ? Promise.resolve(directory) : dataSource.staff.list()
  const [catalog, staff] = await Promise.all([dataSource.catalog.get(), staffPromise])
  return { catalog, staff }
}

export const useApp = create<AppState>((set, get) => ({
  status: 'idle',
  privateStatus: 'idle',
  privateKey: null,
  branches: [],
  directory: [],
  catalog: EMPTY_CATALOG,
  staff: [],
  orders: [],
  ordersLoading: false,

  async init() {
    if (get().status !== 'idle') return
    set({ status: 'loading' })
    try {
      set({ ...(await loadPublic()), status: 'ready' })
      if (!dataSource.requiresAuth) await get().ensurePrivate()
    } catch (e) {
      set({ status: 'error', error: message(e) })
    }
  },

  async ensurePrivate() {
    const key = sessionKey()
    if (!key) return
    const s = get()
    if (s.privateKey === key && (s.privateStatus === 'ready' || s.privateStatus === 'loading')) return
    set({ privateStatus: 'loading', privateKey: key, privateError: undefined })
    try {
      const data = await loadPrivate(get().directory)
      if (get().privateKey === key) set({ ...data, privateStatus: 'ready' })
    } catch (e) {
      if (get().privateKey === key) set({ privateStatus: 'error', privateError: message(e) })
    }
  },

  async loadOrders(query) {
    const id = ++ordersRequest
    set({ ordersLoading: true })
    try {
      const orders = await dataSource.orders.list(query)
      if (id === ordersRequest) set({ orders })
    } finally {
      if (id === ordersRequest) set({ ordersLoading: false })
    }
  },

  async createOrder(input) {
    try {
      const order = await dataSource.orders.create(input)
      set((s) => ({ orders: [order, ...s.orders.filter((o) => o.id !== order.id)] }))
      return order
    } catch (e) {
      // Stale catalog on this terminal: pull fresh prices so the cart can be re-priced.
      if (e instanceof ApiError && (e.code === 'price_changed' || e.code === 'product_unavailable')) {
        await get().refreshCatalog().catch(() => {})
      }
      throw e
    }
  },

  async registerReprint(orderId) {
    const order = await dataSource.orders.registerReprint(orderId)
    set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? order : o)) }))
    return order
  },

  async refreshCatalog() {
    set({ catalog: await dataSource.catalog.get() })
  },

  async saveProduct(p) {
    await dataSource.catalog.saveProduct(p)
    await get().refreshCatalog()
  },

  async saveStaff(member) {
    await dataSource.staff.save(member)
    const [staff, directory] = await Promise.all([dataSource.staff.list(), dataSource.auth.directory()])
    set({ staff, directory })
  },

  async resetDemo() {
    await dataSource.reset?.()
    set({ ...(await loadPublic()), status: 'ready', privateStatus: 'idle', privateKey: null, orders: [] })
    await get().ensurePrivate()
  },
}))

// A different (or no) signed-in user must never see the previous user's data.
useSession.subscribe((s, prev) => {
  if (dataSource.requiresAuth && s.token !== prev.token) {
    ordersRequest++
    useApp.setState({ privateStatus: 'idle', privateKey: null, catalog: EMPTY_CATALOG, staff: [], orders: [], ordersLoading: false })
    if (!s.token) void dataSource.auth.directory().then((directory) => useApp.setState({ directory })).catch(() => {})
  }
})
