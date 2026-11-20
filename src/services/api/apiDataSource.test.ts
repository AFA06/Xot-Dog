import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_CATALOG } from '@/data/demo/catalog'
import { addToCart } from '@/lib/cart'
import { useSession } from '@/store/sessionStore'
import { createApiDataSource } from './apiDataSource'
import { ApiError } from './client'

const hd = DEMO_CATALOG.products.find((p) => p.id === 'hd-classic')!
const spice = { groupId: 'spice', optionId: 'mild', name: { uz: 'x', ru: 'x' }, priceDelta: 0 }

const serverOrder = {
  id: 'o1',
  number: 'C-0001',
  branchId: 'chilonzor',
  cashierId: 'st-c1',
  createdAt: '2026-11-20T10:00:00.000Z',
  type: 'takeaway',
  lines: [],
  subtotal: 36000,
  discount: 0,
  total: 36000,
  payment: { method: 'card', amount: 36000, tendered: null, change: null, status: 'recorded_demo' },
  fiscal: { status: 'not_integrated', receiptId: null, qrUrl: null },
  status: 'completed',
  printCount: 0,
  isDemo: true,
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('API data source', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useSession.setState({ token: 'tok', expiresAt: new Date(Date.now() + 3600_000).toISOString(), role: 'cashier', posBranchId: 'chilonzor', posCashierId: 'st-c1' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('sends only ids + quantities, the bearer token and an idempotency key; normalizes nulls', async () => {
    fetchMock.mockResolvedValueOnce(json(serverOrder, 201))
    const ds = createApiDataSource('/api/v1')
    const order = await ds.orders.create({
      branchId: 'chilonzor',
      cashierId: 'st-c1',
      type: 'takeaway',
      lines: addToCart([], hd, [spice], 2),
      paymentMethod: 'card',
      idempotencyKey: 'key-1',
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/orders')
    const headers = init!.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers['Idempotency-Key']).toBe('key-1')
    expect(JSON.parse(init!.body as string)).toEqual({
      branchId: 'chilonzor',
      type: 'takeaway',
      paymentMethod: 'card',
      expectedTotal: 36000,
      lines: [{ productId: 'hd-classic', quantity: 2, modifiers: [{ groupId: 'spice', optionId: 'mild' }] }],
    })
    expect(order.payment.tendered).toBeUndefined()
    expect(order.fiscal).toEqual({ status: 'not_integrated', receiptId: undefined, qrUrl: undefined })
  })

  it('retries a dropped connection with the SAME idempotency key', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(json(serverOrder, 200))
    const ds = createApiDataSource('/api/v1')
    const p = ds.orders.create({ branchId: 'chilonzor', cashierId: 'st-c1', type: 'takeaway', lines: addToCart([], hd, [spice]), paymentMethod: 'card', idempotencyKey: 'k-2' })
    await vi.advanceTimersByTimeAsync(500)
    expect((await p).id).toBe('o1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const keys = fetchMock.mock.calls.map(([, init]) => (init!.headers as Record<string, string>)['Idempotency-Key'])
    expect(keys).toEqual(['k-2', 'k-2'])
  })

  it('does not retry non-idempotent writes and surfaces backend error codes', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: { code: 'price_changed', message: 'Prices changed' } }, 409))
    const ds = createApiDataSource('/api/v1')
    const err = await ds.staff.save({ id: 'st-c1', name: 'A', role: 'cashier', branchId: 'chilonzor', pin: '', active: true, phone: '' }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('price_changed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('a 401 on a normal request ends the session; a failed login does not', async () => {
    const ds = createApiDataSource('/api/v1')
    fetchMock.mockResolvedValueOnce(json({ detail: { code: 'wrong_pin', message: 'Invalid' } }, 401))
    await expect(ds.auth.login('st-c1', '0000', 'chilonzor')).rejects.toMatchObject({ code: 'wrong_pin' })
    expect(useSession.getState().token).toBe('tok')

    fetchMock.mockResolvedValueOnce(json({ detail: 'Session expired' }, 401))
    await expect(ds.catalog.get()).rejects.toMatchObject({ status: 401 })
    expect(useSession.getState().token).toBeNull()
    expect(useSession.getState().expired).toBe(true)
  })

  it('maps the sign-in directory to staff with demo PIN hints only', async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        { id: 'st-c1', name: 'Aziz', role: 'cashier', branchId: 'chilonzor', demoPin: '1111' },
        { id: 'st-x', name: 'X', role: 'cashier', branchId: 'chilonzor', demoPin: null },
      ]),
    )
    const people = await createApiDataSource('/api/v1').auth.directory()
    expect(people.map((p) => p.pin)).toEqual(['1111', ''])
  })
})
