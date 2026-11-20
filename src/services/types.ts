/**
 * Data-source contracts. The UI only talks to these interfaces.
 *
 * Phase 1: `createDemoDataSource()` (in-browser, localStorage).
 * Later:   an HTTP implementation against FastAPI + PostgreSQL that satisfies
 *          the same interfaces (see src/services/api/README.md).
 */
import type { Branch, Catalog, Order, OrderType, PaymentMethod, Product, Staff } from '@/domain/types'
import type { CartLine } from '@/lib/cart'

export interface NewOrderInput {
  branchId: string
  cashierId: string
  type: OrderType
  lines: CartLine[]
  paymentMethod: PaymentMethod
  tendered?: number
}

export interface OrderQuery {
  branchIds?: string[]
  from?: string
  to?: string
}

export interface OrderRepository {
  list(query?: OrderQuery): Promise<Order[]>
  create(input: NewOrderInput): Promise<Order>
  registerReprint(orderId: string): Promise<Order>
}

export interface CatalogRepository {
  get(): Promise<Catalog>
  saveProduct(product: Product): Promise<Product>
}

export interface StaffRepository {
  list(): Promise<Staff[]>
  save(staff: Staff): Promise<Staff>
}

export interface BranchRepository {
  list(): Promise<Branch[]>
}

export interface DataSource {
  kind: 'demo' | 'api'
  orders: OrderRepository
  catalog: CatalogRepository
  staff: StaffRepository
  branches: BranchRepository
  /** Clears local demo changes (demo source only). */
  reset?(): Promise<void>
}
