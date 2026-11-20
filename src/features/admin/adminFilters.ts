import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DateRange, Order } from '@/domain/types'
import { addDays, comparisonRange, customRange, presetRange, startOfDay, toDateKey, type RangePreset } from '@/lib/dates'
import { filterOrders } from '@/lib/reports'
import { useApp } from '@/store/appStore'

interface AdminFilterState {
  branch: 'all' | string
  preset: RangePreset
  customFrom: string
  customTo: string
  setBranch(b: string): void
  setPreset(p: RangePreset): void
  setCustom(from: string, to: string): void
}

const today = toDateKey(startOfDay(new Date()))

export const useAdminFilters = create<AdminFilterState>()(
  persist(
    (set) => ({
      branch: 'all',
      preset: 'last7',
      customFrom: toDateKey(addDays(new Date(), -13)),
      customTo: today,
      setBranch: (branch) => set({ branch }),
      setPreset: (preset) => set({ preset }),
      setCustom: (customFrom, customTo) => set({ customFrom, customTo, preset: 'custom' }),
    }),
    { name: 'xotdog.adminFilters.v1' },
  ),
)

export function useAdminRange(): DateRange {
  const { preset, customFrom, customTo } = useAdminFilters()
  return useMemo(
    () => (preset === 'custom' ? customRange(customFrom, customTo) : presetRange(preset)),
    [preset, customFrom, customTo],
  )
}

export function useSelectedBranchIds(): string[] {
  const branch = useAdminFilters((s) => s.branch)
  const branches = useApp((s) => s.branches)
  return useMemo(() => (branch === 'all' ? branches.map((b) => b.id) : [branch]), [branch, branches])
}

/** Orders matching the admin branch + date filters, plus the previous equal-length period. */
export function useFilteredOrders(): { range: DateRange; orders: Order[]; previous: Order[]; branchIds: string[] } {
  const all = useApp((s) => s.orders)
  const range = useAdminRange()
  const branchIds = useSelectedBranchIds()
  return useMemo(
    () => ({
      range,
      branchIds,
      orders: filterOrders(all, range, branchIds),
      previous: filterOrders(all, comparisonRange(range), branchIds),
    }),
    [all, range, branchIds],
  )
}
