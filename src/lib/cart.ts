/**
 * Pure cart logic — no React, no storage. Easy to unit-test and to reuse
 * if the cart ever moves to a shared module (e.g. kiosk / PWA).
 */
import type { LocalizedText, ModifierGroup, Product, SelectedModifier } from '@/domain/types'

export interface CartLine {
  key: string
  productId: string
  name: LocalizedText
  basePrice: number
  modifiers: SelectedModifier[]
  quantity: number
}

export interface CartTotals {
  subtotal: number
  discount: number
  total: number
  itemCount: number
}

/** selection: groupId → optionIds */
export type ModifierSelection = Record<string, string[]>

export function unitPrice(line: Pick<CartLine, 'basePrice' | 'modifiers'>): number {
  return line.basePrice + line.modifiers.reduce((s, m) => s + m.priceDelta, 0)
}

export function lineTotal(line: CartLine): number {
  return unitPrice(line) * line.quantity
}

/** Stable identity: same product + same modifiers ⇒ same cart line (quantities merge). */
export function makeLineKey(productId: string, modifiers: SelectedModifier[]): string {
  const mods = modifiers
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|')
  return mods ? `${productId}#${mods}` : productId
}

export function defaultSelection(product: Product, groups: ModifierGroup[]): ModifierSelection {
  const sel: ModifierSelection = {}
  for (const gid of product.modifierGroupIds) {
    const g = groups.find((x) => x.id === gid)
    if (!g) continue
    sel[gid] = g.defaultOptionId ? [g.defaultOptionId] : []
  }
  return sel
}

export function toggleOption(
  selection: ModifierSelection,
  group: ModifierGroup,
  optionId: string,
): ModifierSelection {
  const current = selection[group.id] ?? []
  let next: string[]
  if (group.selection === 'single') {
    next = current[0] === optionId && !group.required ? [] : [optionId]
  } else if (current.includes(optionId)) {
    next = current.filter((id) => id !== optionId)
  } else {
    if (group.max && current.length >= group.max) return selection
    next = [...current, optionId]
  }
  return { ...selection, [group.id]: next }
}

/** Returns ids of required groups that have no selection. */
export function missingRequiredGroups(
  product: Product,
  groups: ModifierGroup[],
  selection: ModifierSelection,
): string[] {
  return product.modifierGroupIds.filter((gid) => {
    const g = groups.find((x) => x.id === gid)
    return g?.required && !(selection[gid]?.length)
  })
}

export function resolveModifiers(
  product: Product,
  groups: ModifierGroup[],
  selection: ModifierSelection,
): SelectedModifier[] {
  const out: SelectedModifier[] = []
  for (const gid of product.modifierGroupIds) {
    const g = groups.find((x) => x.id === gid)
    if (!g) continue
    for (const oid of selection[gid] ?? []) {
      const o = g.options.find((x) => x.id === oid)
      if (o) out.push({ groupId: g.id, optionId: o.id, name: o.name, priceDelta: o.priceDelta })
    }
  }
  return out
}

export function addToCart(
  cart: CartLine[],
  product: Product,
  modifiers: SelectedModifier[] = [],
  quantity = 1,
): CartLine[] {
  const key = makeLineKey(product.id, modifiers)
  const existing = cart.find((l) => l.key === key)
  if (existing) {
    return cart.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l))
  }
  return [
    ...cart,
    { key, productId: product.id, name: product.name, basePrice: product.price, modifiers, quantity },
  ]
}

export function setLineQuantity(cart: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity <= 0) return cart.filter((l) => l.key !== key)
  return cart.map((l) => (l.key === key ? { ...l, quantity: Math.min(quantity, 99) } : l))
}

export function removeLine(cart: CartLine[], key: string): CartLine[] {
  return cart.filter((l) => l.key !== key)
}

export function cartTotals(cart: CartLine[], discount = 0): CartTotals {
  const subtotal = cart.reduce((s, l) => s + lineTotal(l), 0)
  const d = Math.min(Math.max(discount, 0), subtotal)
  return {
    subtotal,
    discount: d,
    total: subtotal - d,
    itemCount: cart.reduce((s, l) => s + l.quantity, 0),
  }
}

/** Change for a cash payment; null when tendered is insufficient. */
export function computeChange(total: number, tendered: number): number | null {
  if (!Number.isFinite(tendered) || tendered < total) return null
  return tendered - total
}

/** Suggested banknote amounts for quick cash buttons (UZS notes: 5k,10k,20k,50k,100k,200k). */
export function quickCashOptions(total: number): number[] {
  const notes = [5000, 10000, 20000, 50000, 100000, 200000]
  const set = new Set<number>([total])
  for (const n of notes) {
    const rounded = Math.ceil(total / n) * n
    if (rounded > total) set.add(rounded)
  }
  return [...set].sort((a, b) => a - b).slice(0, 5)
}

/** Re-applies current catalog prices to cart lines (after the server reported a price change). */
export function repriceLines(cart: CartLine[], products: Product[], groups: ModifierGroup[]): CartLine[] {
  return cart.map((l) => {
    const p = products.find((x) => x.id === l.productId)
    if (!p) return l
    const modifiers = l.modifiers.map((m) => {
      const o = groups.find((g) => g.id === m.groupId)?.options.find((x) => x.id === m.optionId)
      return o ? { ...m, name: o.name, priceDelta: o.priceDelta } : m
    })
    return { ...l, name: p.name, basePrice: p.price, modifiers }
  })
}
