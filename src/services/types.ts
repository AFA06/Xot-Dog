/**
 * Data-source contracts. The UI only talks to these interfaces.
 *
 * Phase 1: `createDemoDataSource()` (in-browser, localStorage).
 * Phase 2: `createApiDataSource()` (FastAPI + PostgreSQL, see backend/).
 */
import type { Branch, Catalog, Order, OrderType, PaymentMethod, Product, Staff, StaffRole } from '@/domain/types'
import type { CartLine } from '@/lib/cart'
import type { DailyPoint, HourlyPoint, ProductStat, SalesSummary } from '@/lib/reports'

export interface NewOrderInput {
  branchId: string
  cashierId: string
  type: OrderType
  lines: CartLine[]
  paymentMethod: PaymentMethod
  tendered?: number
  /** Stable per checkout attempt so retries never create duplicate orders. */
  idempotencyKey?: string
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

/** Signed-in staff member. `branchId` = the POS branch (null for an admin-panel session). */
export interface AuthSession {
  token: string
  staffId: string
  role: StaffRole
  branchId: string | null
  expiresAt: string
}

export interface AuthRepository {
  /** Active staff for the sign-in picker. `pin` is only filled with a demo hint, never a real PIN. */
  directory(): Promise<Staff[]>
  login(staffId: string, pin: string, branchId: string | null): Promise<AuthSession>
}

export interface DashboardQuery {
  branchIds: string[]
  from: string
  to: string
  compareFrom: string
  compareTo: string
}

export interface DashboardData {
  summary: SalesSummary
  previous: SalesSummary
  perBranch: { branchId: string; summary: SalesSummary }[]
  daily: DailyPoint[]
  hourly: HourlyPoint[]
  bestsellersByQuantity: ProductStat[]
  bestsellersByRevenue: ProductStat[]
  categoryRevenue: Record<string, number>
  staff: { staffId: string; orders: number; revenue: number }[]
}

export interface AnalyticsRepository {
  dashboard(query: DashboardQuery): Promise<DashboardData>
}

export interface DataSource {
  kind: 'demo' | 'api'
  /** API mode: every screen except the launcher needs a signed-in staff member. */
  requiresAuth: boolean
  auth: AuthRepository
  orders: OrderRepository
  catalog: CatalogRepository
  staff: StaffRepository
  branches: BranchRepository
  analytics: AnalyticsRepository
  /** Clears local demo changes (demo source only). */
  reset?(): Promise<void>
}
