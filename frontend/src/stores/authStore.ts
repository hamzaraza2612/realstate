import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResult, UserProfile } from '@/types/api'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (result: AuthResult) => void
  clear: () => void
  hasPermission: (code: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (result) =>
        set({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      hasPermission: (code) => {
        const state = get()
        return state.user?.isSuperAdmin === true || state.user?.permissions.includes(code) === true
      },
    }),
    { name: 'erp-auth' },
  ),
)
