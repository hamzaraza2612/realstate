import { portalApiClient } from '@/api/portalApiClient'
import { createQueryHooks } from '@/api/pagedQuery'

/**
 * The shared paged-list / single-resource query helpers (`api/pagedQuery.ts`) bound to the PORTAL
 * client. Every portal data hook goes through these two, so no portal screen can accidentally reach
 * the internal `apiClient` — this folder never imports it.
 */
export const { usePagedList: usePortalPagedList, useApiGet: usePortalGet } = createQueryHooks(portalApiClient)

/** TanStack query-key root for everything portal — cleared with the rest of the cache on sign-out. */
export const PORTAL_KEY = ['portal'] as const
