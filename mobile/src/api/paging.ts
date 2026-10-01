import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query'
import { apiClient } from './apiClient'
import type { ApiEnvelope, PageMeta, Paged } from '@/types/api'

/**
 * Shared query helpers for the Phase 2 module screens, generalizing exactly what
 * `features/notifications/api.ts` already does for one endpoint:
 *
 *  - `usePagedList` — a server-paginated list (`PagedRequest`: `page`/`pageSize`, plus the endpoint's
 *    own existing filter params such as `search`/`status`) as a TanStack infinite query: one page of
 *    20 at a time, "Load more" fetches the next page. A list is never loaded unbounded.
 *  - `useApiGet` — one resource (`GET /…/{id}` and the few existing per-record sub-resources).
 *
 * Both call the internal `apiClient` only (staff session); portal screens never use these.
 */

export const PAGE_SIZE = 20

export type QueryParams = Record<string, string | number | boolean | null | undefined>

/** Drops empty filter values so the query string carries only what the user actually chose. */
function cleanParams(params: QueryParams): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    clean[key] = value
  }
  return clean
}

export function usePagedList<T>(
  queryKey: readonly unknown[],
  path: string,
  params: QueryParams = {},
  options: { enabled?: boolean; pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? PAGE_SIZE
  const filters = cleanParams(params)
  return useInfiniteQuery({
    queryKey: [...queryKey, 'list', filters, pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<Paged<T>> => {
      const response = await apiClient.get<ApiEnvelope<T[]>>(path, { params: { ...filters, page: pageParam, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    getNextPageParam: (last) => (last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined),
    enabled: options.enabled ?? true,
  })
}

export type PagedListQuery<T> = ReturnType<typeof usePagedList<T>>

export function flattenPages<T>(data: InfiniteData<Paged<T>> | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}

/** Total matching rows as reported by the server (`meta.total` of the first page). */
export function pagedTotal<T>(data: InfiniteData<Paged<T>> | undefined): number | undefined {
  return data?.pages[0]?.meta.total
}

export function useApiGet<T>(queryKey: readonly unknown[], path: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<T>>(path)
      return response.data.data
    },
    enabled: options.enabled ?? true,
  })
}
