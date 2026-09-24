import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PortalAuthResult, PortalProfile } from '@/types/api'

// Deliberately separate from `useAuthStore` (internal ERP staff sessions) and persisted under a
// DIFFERENT localStorage key, so a portal user and an internal staff user can be signed in
// simultaneously in different tabs without one session's token leaking into the other's requests.
// See docs/PORTAL_ARCHITECTURE.md for why portal identities are a wholly separate table/token kind.
interface PortalAuthState {
  profile: PortalProfile | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (result: PortalAuthResult) => void
  clear: () => void
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      profile: null,
      accessToken: null,
      refreshToken: null,
      setSession: (result) =>
        set({
          profile: result.profile,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      clear: () => set({ profile: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'erp-portal-auth' },
  ),
)
