import type { PortalProfile, UserProfile } from '@/types/api'
import { createSessionStore } from './sessionStore'

/** Internal ERP staff session (AppUser JWT family). Read by `src/api/apiClient.ts` only. */
export const internalSessionStore = createSessionStore<UserProfile>('internal')

/** External portal session (PortalUser JWT family, `token_use: "portal"`). Read by
 * `src/api/portalApiClient.ts` only — never shares a token source with the internal store. */
export const portalSessionStore = createSessionStore<PortalProfile>('portal')
