import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@/domain/types'

/** Per-device preferences and the current POS sign-in (demo only, no real auth). */
interface SessionState {
  locale: Locale
  posBranchId: string | null
  posCashierId: string | null
  setLocale(l: Locale): void
  signIn(branchId: string, cashierId: string): void
  signOut(): void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      locale: 'uz',
      posBranchId: null,
      posCashierId: null,
      setLocale: (locale) => set({ locale }),
      signIn: (posBranchId, posCashierId) => set({ posBranchId, posCashierId }),
      signOut: () => set({ posBranchId: null, posCashierId: null }),
    }),
    { name: 'xotdog.session.v1' },
  ),
)
