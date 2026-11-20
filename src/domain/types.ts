/**
 * Core domain model.
 *
 * These types are intentionally backend-agnostic: the future FastAPI + PostgreSQL
 * service should expose the same shapes (snake_case ⇄ camelCase mapping happens
 * in the API adapter, not here). All money values are integer UZS (so'm).
 */

export type Locale = 'uz' | 'ru'
export type LocalizedText = Record<Locale, string>

export type BranchId = string
export type ProductId = string
export type StaffId = string
export type OrderId = string

export type CategoryId = 'hotdogs' | 'burgers' | 'sides' | 'drinks' | 'combos'

export interface Category {
  id: CategoryId
  name: LocalizedText
  sort: number
}

export interface ModifierOption {
  id: string
  name: LocalizedText
  /** Price added per unit, UZS. May be 0. */
  priceDelta: number
}

export interface ModifierGroup {
  id: string
  name: LocalizedText
  /** single = radio, multi = checkboxes */
  selection: 'single' | 'multi'
  required: boolean
  /** Upper bound for multi groups. */
  max?: number
  options: ModifierOption[]
  /** Option pre-selected for single/required groups. */
  defaultOptionId?: string
}

export interface Product {
  id: ProductId
  sku: string
  categoryId: CategoryId
  name: LocalizedText
  description?: LocalizedText
  /** Base unit price, UZS. */
  price: number
  modifierGroupIds: string[]
  active: boolean
  /** Branches where the product is sold. */
  branchIds: BranchId[]
  /** Visual accent for the POS tile. */
  tone: ProductTone
}

export type ProductTone = 'red' | 'mustard' | 'brown' | 'green' | 'blue' | 'purple'

export interface Branch {
  id: BranchId
  code: string
  name: LocalizedText
  address: LocalizedText
  phone: string
  /** Ticket-number prefix, e.g. "C" → C-0042 */
  ticketPrefix: string
}

export type StaffRole = 'cashier' | 'manager' | 'owner'

export interface Staff {
  id: StaffId
  name: string
  role: StaffRole
  /** null = all branches (owner) */
  branchId: BranchId | null
  /** Demo-only PIN. Real auth will live in the backend. */
  pin: string
  active: boolean
  phone: string
}

export type PaymentMethod = 'cash' | 'card'
export type OrderType = 'dine_in' | 'takeaway'

export interface SelectedModifier {
  groupId: string
  optionId: string
  name: LocalizedText
  priceDelta: number
}

export interface OrderLine {
  id: string
  productId: ProductId
  /** Snapshot of the name at sale time. */
  name: LocalizedText
  unitPrice: number
  quantity: number
  modifiers: SelectedModifier[]
  lineTotal: number
}

/**
 * Phase 1: payment is only *recorded* (which method the cashier chose).
 * No acquirer / terminal / Payme / Click integration exists.
 */
export interface PaymentRecord {
  method: PaymentMethod
  amount: number
  tendered?: number
  change?: number
  status: 'recorded_demo'
}

/**
 * Phase 1: no fiscal module (OFD / virtual cash register) is connected.
 * Every order is explicitly `not_integrated` — never shown as fiscalized.
 */
export type FiscalStatus = 'not_integrated' | 'pending' | 'fiscalized' | 'failed'

export interface FiscalInfo {
  status: FiscalStatus
  receiptId?: string
  qrUrl?: string
}

export type OrderStatus = 'completed' | 'voided'

export interface Order {
  id: OrderId
  number: string
  branchId: BranchId
  cashierId: StaffId
  createdAt: string // ISO 8601
  type: OrderType
  lines: OrderLine[]
  subtotal: number
  discount: number
  total: number
  payment: PaymentRecord
  fiscal: FiscalInfo
  status: OrderStatus
  printCount: number
  /** True for every record in Phase 1. */
  isDemo: boolean
}

export interface Catalog {
  categories: Category[]
  products: Product[]
  modifierGroups: ModifierGroup[]
}

export interface DateRange {
  /** inclusive, ISO date-time */
  from: string
  /** exclusive, ISO date-time */
  to: string
}
