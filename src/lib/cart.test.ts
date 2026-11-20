import { describe, expect, it } from 'vitest'
import { DEMO_CATALOG } from '@/data/demo/catalog'
import {
  addToCart,
  cartTotals,
  computeChange,
  defaultSelection,
  makeLineKey,
  missingRequiredGroups,
  quickCashOptions,
  resolveModifiers,
  setLineQuantity,
  toggleOption,
} from './cart'

const groups = DEMO_CATALOG.modifierGroups
const product = (id: string) => DEMO_CATALOG.products.find((p) => p.id === id)!

describe('cart', () => {
  it('merges identical product+modifier lines and keeps different modifiers apart', () => {
    const hd = product('hd-classic')
    const cheese = resolveModifiers(hd, groups, { extras: ['extra-cheese'] })
    let cart = addToCart([], hd)
    cart = addToCart(cart, hd)
    cart = addToCart(cart, hd, cheese)
    expect(cart).toHaveLength(2)
    expect(cart[0].quantity).toBe(2)
    expect(cartTotals(cart).total).toBe(18000 * 2 + 18000 + 4000)
    expect(cartTotals(cart).itemCount).toBe(3)
  })

  it('line key is independent of modifier order', () => {
    const a = makeLineKey('x', [
      { groupId: 'g', optionId: '1', name: { uz: '', ru: '' }, priceDelta: 0 },
      { groupId: 'g', optionId: '2', name: { uz: '', ru: '' }, priceDelta: 0 },
    ])
    const b = makeLineKey('x', [
      { groupId: 'g', optionId: '2', name: { uz: '', ru: '' }, priceDelta: 0 },
      { groupId: 'g', optionId: '1', name: { uz: '', ru: '' }, priceDelta: 0 },
    ])
    expect(a).toBe(b)
  })

  it('removes a line when quantity drops to zero', () => {
    const cart = addToCart([], product('dr-water'))
    expect(setLineQuantity(cart, cart[0].key, 0)).toEqual([])
  })

  it('applies negative and positive price deltas (drink size)', () => {
    const cola = product('dr-cola')
    const small = resolveModifiers(cola, groups, { 'drink-size': ['033'] })
    const big = resolveModifiers(cola, groups, { 'drink-size': ['1'] })
    expect(cartTotals(addToCart([], cola, small)).total).toBe(8000)
    expect(cartTotals(addToCart([], cola, big)).total).toBe(15000)
  })

  it('pre-selects defaults so required groups are satisfied', () => {
    const combo = product('cb-burger')
    const sel = defaultSelection(combo, groups)
    expect(missingRequiredGroups(combo, groups, sel)).toEqual([])
    expect(missingRequiredGroups(combo, groups, { ...sel, 'combo-drink': [] })).toEqual(['combo-drink'])
  })

  it('respects single-choice and max limits', () => {
    const spice = groups.find((g) => g.id === 'spice')!
    const sauces = groups.find((g) => g.id === 'sauces')!
    let sel = toggleOption({ spice: ['mild'] }, spice, 'hot')
    expect(sel.spice).toEqual(['hot'])
    // required single cannot be deselected
    sel = toggleOption(sel, spice, 'hot')
    expect(sel.spice).toEqual(['hot'])
    let s2 = {}
    for (const id of ['ketchup', 'mustard', 'mayo', 'bbq']) s2 = toggleOption(s2, sauces, id)
    expect((s2 as Record<string, string[]>).sauces).toEqual(['ketchup', 'mustard', 'mayo'])
  })

  it('computes change and rejects insufficient cash', () => {
    expect(computeChange(38000, 50000)).toBe(12000)
    expect(computeChange(38000, 38000)).toBe(0)
    expect(computeChange(38000, 30000)).toBeNull()
  })

  it('suggests exact amount first and banknote round-ups', () => {
    expect(quickCashOptions(38000)).toEqual([38000, 40000, 50000, 100000, 200000])
  })
})
