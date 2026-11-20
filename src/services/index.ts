import { createApiDataSource } from './api/apiDataSource'
import { createDemoDataSource } from './demo/demoDataSource'
import type { DataSource } from './types'

/**
 * Single switch point for the data source.
 *   VITE_DATA_SOURCE=api  → FastAPI + PostgreSQL backend at VITE_API_URL (default /api/v1)
 *   VITE_DATA_SOURCE=demo → Phase 1 in-browser demo (default; used by unit tests)
 */
export function createDataSource(): DataSource {
  const kind = import.meta.env.VITE_DATA_SOURCE ?? 'demo'
  if (kind === 'api') return createApiDataSource(import.meta.env.VITE_API_URL ?? '/api/v1')
  if (kind !== 'demo') console.warn(`[data] unknown data source "${kind}" — falling back to demo.`)
  return createDemoDataSource()
}

export const dataSource = createDataSource()
export { ApiError } from './api/client'
export type * from './types'
