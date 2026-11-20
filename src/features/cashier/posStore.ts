import { create } from 'zustand'
import type { CategoryId, OrderType, PaymentMethod, Product, SelectedModifier } from '@/domain/types'
import { addToCart, removeLine, setLineQuantity, type CartLine } from '@/lib/cart'

interface PosState {
  cart: CartLine[]
  category: CategoryId
  orderType: OrderType
  payment: PaymentMethod
  setCategory(c: CategoryId): void
  setOrderType(t: OrderType): void
  setPayment(p: PaymentMethod): void
  add(product: Product, modifiers?: SelectedModifier[], qty?: number): void
  setQty(key: string, qty: number): void
  remove(key: string): void
  clear(): void
}

export const usePos = create<PosState>((set) => ({
  cart: [],
  category: 'hotdogs',
  orderType: 'takeaway',
  payment: 'cash',
  setCategory: (category) => set({ category }),
  setOrderType: (orderType) => set({ orderType }),
  setPayment: (payment) => set({ payment }),
  add: (product, modifiers = [], qty = 1) => set((s) => ({ cart: addToCart(s.cart, product, modifiers, qty) })),
  setQty: (key, qty) => set((s) => ({ cart: setLineQuantity(s.cart, key, qty) })),
  remove: (key) => set((s) => ({ cart: removeLine(s.cart, key) })),
  clear: () => set({ cart: [], payment: 'cash' }),
}))
