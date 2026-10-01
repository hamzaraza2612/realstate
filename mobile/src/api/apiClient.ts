import { internalSessionStore } from '@/auth/stores'
import type { AuthResult, UserProfile } from '@/types/api'
import { createApiClient } from './createApiClient'

/** Internal ERP staff API client — the mobile port of `frontend/src/lib/apiClient.ts`. Token source:
 * `internalSessionStore` only. Refresh: `POST /auth/refresh` with `{ refreshToken }`. */
export const apiClient = createApiClient<AuthResult, UserProfile>({
  store: internalSessionStore,
  refreshPath: '/auth/refresh',
  toSession: (result) => ({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt,
    // The refreshed `user` carries the CURRENT roles/permissions, so a permission change made on
    // the web reaches the mobile nav at the next token refresh without a re-login.
    profile: result.user,
  }),
})

export { extractErrorMessage, extractErrorCode, extractStatus, isNetworkError } from './createApiClient'
