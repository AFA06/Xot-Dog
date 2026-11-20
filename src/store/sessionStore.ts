import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale, StaffRole } from '@/domain/types'
import { configureApiAuth } from '@/services/api/client'
import type { AuthSession } from '@/services/types'

/**
 * Per-device preferences and the current sign-in.
 *  - POS session: posBranchId + posCashierId (the signed-in staff member).
 *  - Admin session: posBranchId = null, role manager/owner.
 * In API mode `token` is the backend JWT; demo mode keeps the Phase 1 behaviour (no real auth).
 */
interface SessionState {
  locale: Locale
  posBranchId: string | null
  posCashierId: string | null
  role: StaffRole | null
  token: string | null
  expiresAt: string | null
  /** Set when the server ended the session (expired / deactivated) — shown once on the launcher. */
  expired: boolean
  setLocale(l: Locale): void
  signIn(branchId: string, cashierId: string): void
  startSession(s: AuthSession): void
  signOut(): void
  clearExpired(): void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      locale: 'uz',
      posBranchId: null,
      posCashierId: null,
      role: null,
      token: null,
      expiresAt: null,
      expired: false,
      setLocale: (locale) => set({ locale }),
      signIn: (posBranchId, posCashierId) => set({ posBranchId, posCashierId }),
      startSession: (s) =>
        set({ posBranchId: s.branchId, posCashierId: s.staffId, role: s.role, token: s.token, expiresAt: s.expiresAt, expired: false }),
      signOut: () => set({ posBranchId: null, posCashierId: null, role: null, token: null, expiresAt: null }),
      clearExpired: () => set({ expired: false }),
    }),
    { name: 'xotdog.session.v1' },
  ),
)

/** Valid, unexpired API token (or null). */
export function currentToken(): string | null {
  const { token, expiresAt } = useSession.getState()
  if (!token || (expiresAt && new Date(expiresAt).getTime() <= Date.now())) return null
  return token
}

export const isAdminRole = (role: StaffRole | null) => role === 'manager' || role === 'owner'

configureApiAuth({
  getToken: currentToken,
  onUnauthorized: () => {
    if (useSession.getState().token) {
      useSession.getState().signOut()
      useSession.setState({ expired: true })
    }
  },
})
