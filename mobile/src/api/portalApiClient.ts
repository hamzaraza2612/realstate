import { portalSessionStore } from '@/auth/stores'
import type { PortalAuthResult, PortalProfile } from '@/types/api'
import { createApiClient } from './createApiClient'

/** External-portal API client — the mobile port of `frontend/src/lib/portalApiClient.ts`. A
 * separate axios instance with its own token source (`portalSessionStore`) and its own refresh
 * endpoint (`POST /portal/auth/refresh`); see docs/PORTAL_ARCHITECTURE.md for why the two auth
 * surfaces must never share a token source. Portal screens must never import `apiClient.ts`. */
export const portalApiClient = createApiClient<PortalAuthResult, PortalProfile>({
  store: portalSessionStore,
  refreshPath: '/portal/auth/refresh',
  toSession: (result) => ({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt,
    profile: result.profile,
  }),
})

export { extractErrorMessage, extractErrorCode, extractStatus, isNetworkError } from './createApiClient'
