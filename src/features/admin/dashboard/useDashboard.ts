import { useEffect, useState } from 'react'
import { comparisonRange } from '@/lib/dates'
import { dataSource, type DashboardData } from '@/services'
import { useApp } from '@/store/appStore'
import { useAdminRange, useSelectedBranchIds } from '../adminFilters'

/**
 * Dashboard aggregates for the current admin filters.
 * API mode: computed in PostgreSQL. Demo mode: computed in-browser with src/lib/reports.ts.
 */
export function useDashboard() {
  const range = useAdminRange()
  const branchIds = useSelectedBranchIds()
  // Refetch after a sale is recorded on this device.
  const ordersVersion = useApp((s) => s.orders)
  const [state, setState] = useState<{ data: DashboardData | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  })
  const key = branchIds.join(',')

  useEffect(() => {
    let cancelled = false
    const prev = comparisonRange(range)
    setState((s) => ({ ...s, loading: true, error: null }))
    dataSource.analytics
      .dashboard({ branchIds: key ? key.split(',') : [], from: range.from, to: range.to, compareFrom: prev.from, compareTo: prev.to })
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => !cancelled && setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e), loading: false })))
    return () => {
      cancelled = true
    }
  }, [key, range, ordersVersion])

  return { range, branchIds, ...state }
}
