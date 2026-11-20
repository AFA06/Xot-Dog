/**
 * Fiscal adapter contract (OFD / virtual fiscal module — future phase).
 *
 * Phase 1 deliberately does NOT simulate fiscalization. Every order carries
 * `fiscal.status = 'not_integrated'` and tickets are labelled
 * "FISKAL CHEK EMAS / НЕ ФИСКАЛЬНЫЙ ЧЕК".
 */
import type { FiscalInfo, Order } from '@/domain/types'

export interface FiscalAdapter {
  readonly integrated: boolean
  register(order: Order): Promise<FiscalInfo>
}

export const notIntegratedFiscal: FiscalAdapter = {
  integrated: false,
  async register() {
    return { status: 'not_integrated' }
  },
}
