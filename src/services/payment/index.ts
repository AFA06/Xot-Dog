/**
 * Payment adapter contract.
 *
 * Phase 1 has NO payment integration. The demo adapter only records which
 * method the cashier selected. It never contacts a bank, terminal, Payme,
 * Click, Uzcard or Humo, and never reports an "approved" transaction.
 */
import type { PaymentMethod, PaymentRecord } from '@/domain/types'
import { computeChange } from '@/lib/cart'

export interface PaymentAdapter {
  readonly integrated: boolean
  record(method: PaymentMethod, amount: number, tendered?: number): PaymentRecord
}

export const demoPaymentRecorder: PaymentAdapter = {
  integrated: false,
  record(method, amount, tendered) {
    if (method === 'cash') {
      const t = tendered ?? amount
      const change = computeChange(amount, t)
      if (change === null) throw new Error('Insufficient cash tendered')
      return { method, amount, tendered: t, change, status: 'recorded_demo' }
    }
    return { method, amount, status: 'recorded_demo' }
  },
}
