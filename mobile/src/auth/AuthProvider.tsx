import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { apiClient } from '@/api/apiClient'
import { queryClient } from '@/api/queryClient'
import { fetchTenantLocalization, resetTenantLocalization } from '@/i18n/tenantLocalization'
import type { ApiEnvelope, AuthResult, UserProfile } from '@/types/api'
import type { SessionStatus } from './sessionStore'
import { internalSessionStore } from './stores'

/**
 * Internal (ERP staff) auth context — `POST /auth/login|logout`, tokens in SecureStore via
 * `internalSessionStore`. Mirrors the web `useAuthStore` (`user`, `setSession`, `clear`,
 * `hasPermission`). There is no `GET /auth/me` for staff on the backend; the profile cached at login
 * is kept current by every token refresh (the refresh response carries the latest `user`).
 */

interface AuthContextValue {
  status: SessionStatus
  user: UserProfile | null
  login: (email: string, password: string) => Promise<UserProfile>
  logout: () => Promise<void>
  /** UX convenience only — the backend re-checks every permission on every request. */
  hasPermission: (code: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(internalSessionStore.subscribe, internalSessionStore.getState)
  const user = state.session?.profile ?? null

  useEffect(() => {
    void internalSessionStore.restore()
  }, [])

  // Bootstrap the tenant's currency/locale once a session exists (fresh login or restored), the
  // same point the web AppShell fetches `GET /localization/current`.
  useEffect(() => {
    if (state.status === 'authenticated') void fetchTenantLocalization(apiClient, '/localization/current')
  }, [state.status])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<ApiEnvelope<AuthResult>>('/auth/login', { email, password })
    const result = response.data.data
    queryClient.clear()
    resetTenantLocalization()
    await internalSessionStore.setSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      profile: result.user,
    })
    return result.user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = internalSessionStore.getState().session?.refreshToken
    if (refreshToken) {
      // Best-effort server-side revocation; signing out locally must work even offline.
      await apiClient.post('/auth/logout', { refreshToken }).catch(() => undefined)
    }
    await internalSessionStore.clear()
    resetTenantLocalization()
    queryClient.clear()
  }, [])

  const hasPermission = useCallback(
    (code: string) => user?.isSuperAdmin === true || user?.permissions.includes(code) === true,
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user, login, logout, hasPermission }),
    [state.status, user, login, logout, hasPermission],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
