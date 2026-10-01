import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { portalApiClient } from '@/api/portalApiClient'
import { queryClient } from '@/api/queryClient'
import { fetchTenantLocalization, resetTenantLocalization } from '@/i18n/tenantLocalization'
import type { ApiEnvelope, PortalAuthResult, PortalLoginRequest, PortalProfile } from '@/types/api'
import type { SessionStatus } from './sessionStore'
import { portalSessionStore } from './stores'

/**
 * External-portal auth context — `POST /portal/auth/login|logout`, `GET /portal/auth/me`, tokens in
 * SecureStore under the `erp.portal.*` keys via `portalSessionStore`. Mirrors the web
 * `usePortalAuthStore`. Never shares a client, store or token with `AuthProvider`.
 */

interface PortalAuthContextValue {
  status: SessionStatus
  profile: PortalProfile | null
  login: (request: PortalLoginRequest) => Promise<PortalProfile>
  logout: () => Promise<void>
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null)

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(portalSessionStore.subscribe, portalSessionStore.getState)
  const profile = state.session?.profile ?? null

  useEffect(() => {
    void portalSessionStore.restore()
  }, [])

  useEffect(() => {
    if (state.status !== 'authenticated') return
    void fetchTenantLocalization(portalApiClient, '/portal/localization')
    // Refresh the cached profile in the background (display name / tenant may have changed). A 401
    // here goes through the normal refresh-then-sign-out path in the interceptor.
    portalApiClient
      .get<ApiEnvelope<PortalProfile>>('/portal/auth/me')
      .then(async (response) => {
        const current = portalSessionStore.getState().session
        if (current) await portalSessionStore.setSession({ ...current, profile: response.data.data })
      })
      .catch(() => undefined)
  }, [state.status])

  const login = useCallback(async (request: PortalLoginRequest) => {
    const response = await portalApiClient.post<ApiEnvelope<PortalAuthResult>>('/portal/auth/login', request)
    const result = response.data.data
    queryClient.clear()
    resetTenantLocalization()
    await portalSessionStore.setSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      profile: result.profile,
    })
    return result.profile
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = portalSessionStore.getState().session?.refreshToken
    if (refreshToken) {
      await portalApiClient.post('/portal/auth/logout', { refreshToken }).catch(() => undefined)
    }
    await portalSessionStore.clear()
    resetTenantLocalization()
    queryClient.clear()
  }, [])

  const value = useMemo<PortalAuthContextValue>(
    () => ({ status: state.status, profile, login, logout }),
    [state.status, profile, login, logout],
  )

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext)
  if (!ctx) throw new Error('usePortalAuth must be used within a PortalAuthProvider')
  return ctx
}
