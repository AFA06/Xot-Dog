import { createDemoDataSource } from './demo/demoDataSource'
import type { DataSource } from './types'

/**
 * Single switch point for the data source. Only "demo" exists in Phase 1.
 * `VITE_DATA_SOURCE=api` is reserved for the future FastAPI adapter.
 */
export function createDataSource(): DataSource {
  const kind = import.meta.env.VITE_DATA_SOURCE ?? 'demo'
  if (kind !== 'demo') {
    console.warn(`[data] "${kind}" data source is not implemented in Phase 1 — falling back to demo.`)
  }
  return createDemoDataSource()
}

export const dataSource = createDataSource()
export type * from './types'
