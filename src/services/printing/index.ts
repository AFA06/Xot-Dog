/**
 * Printer adapter contract.
 *
 * Phase 1: `simulatedPrinter` only logs the job — nothing is sent to any device.
 * Later:   a local printer agent (e.g. a small service on the Windows POS at
 *          http://127.0.0.1:<port>) will receive TicketDocument JSON and print
 *          ESC/POS to the thermal printer.
 */
import type { TicketDocument } from './ticket'

export interface PrintResult {
  status: 'simulated' | 'sent' | 'failed'
  at: string
  message?: string
}

export interface PrinterAdapter {
  readonly connected: boolean
  print(ticket: TicketDocument, meta: { orderId: string; copy: boolean }): Promise<PrintResult>
}

export const simulatedPrinter: PrinterAdapter = {
  connected: false,
  async print(_ticket, meta) {
    if (import.meta.env.DEV) console.info('[print:simulated]', meta)
    return { status: 'simulated', at: new Date().toISOString() }
  },
}

export * from './ticket'
