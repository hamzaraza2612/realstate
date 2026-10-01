import { apiClient } from './apiClient'
import { createQueryHooks } from './pagedQuery'

/**
 * The Phase 2 module screens' query helpers (`usePagedList` / `useApiGet`, see `pagedQuery.ts`),
 * bound to the internal `apiClient` only (staff session). Portal screens never use these — they use
 * the same helpers bound to `portalApiClient` in `features/portal/api/portalQueries.ts`.
 */
export const { usePagedList, useApiGet } = createQueryHooks(apiClient)

export { PAGE_SIZE, flattenPages, pagedTotal, type PagedListQuery, type QueryParams } from './pagedQuery'
