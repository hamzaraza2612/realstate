import { useInfiniteQuery, useQuery, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query'
import type { AxiosInstance } from 'axios'
import type { ApiEnvelope, PageMeta, Paged } from '@/types/api'

/**
 * Client-agnostic query helpers. Each auth surface binds them to ITS OWN axios instance exactly
 * once — `api/paging.ts` to the internal `apiClient`, `features/portal/api/portalQueries.ts` to
 * `portalApiClient` — so a screen never chooses a client per call and this file imports neither.
 *
 *  - `usePagedList` — a server-paginated list (`PagedRequest`: `page`/`pageSize`, plus the endpoint's
 *    own existing filter params such as `search`/`status`) as a TanStack infinite query: one page of
 *    20 at a time, "Load more" fetches the next page. A list is never loaded unbounded.
 *  - `useApiGet` — one resource (`GET /…/{id}`, a per-record sub-resource, or an endpoint the
 *    backend itself returns as a plain, unpaged array).
 */

export const PAGE_SIZE = 20

export type QueryParams = Record<string, string | number | boolean | null | undefined>

export type PagedListQuery<T> = UseInfiniteQueryResult<InfiniteData<Paged<T>>, Error>

/** Drops empty filter values so the query string carries only what the user actually chose. */
function cleanParams(params: QueryParams): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    clean[key] = value
  }
  return clean
}

export function createQueryHooks(client: AxiosInstance) {
  function usePagedList<T>(
    queryKey: readonly unknown[],
    path: string,
    params: QueryParams = {},
    options: { enabled?: boolean; pageSize?: number } = {},
  ): PagedListQuery<T> {
    const pageSize = options.pageSize ?? PAGE_SIZE
    const filters = cleanParams(params)
    return useInfiniteQuery({
      queryKey: [...queryKey, 'list', filters, pageSize],
      initialPageParam: 1,
      queryFn: async ({ pageParam }): Promise<Paged<T>> => {
        const response = await client.get<ApiEnvelope<T[]>>(path, { params: { ...filters, page: pageParam, pageSize } })
        return { items: response.data.data, meta: response.data.meta as PageMeta }
      },
      getNextPageParam: (last) => (last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined),
      enabled: options.enabled ?? true,
    })
  }

  function useApiGet<T>(queryKey: readonly unknown[], path: string, options: { enabled?: boolean; params?: QueryParams; retry?: boolean } = {}) {
    const params = options.params ? cleanParams(options.params) : undefined
    return useQuery({
      queryKey: params ? [...queryKey, params] : queryKey,
      queryFn: async () => {
        const response = await client.get<ApiEnvelope<T>>(path, params ? { params } : undefined)
        return response.data.data
      },
      enabled: options.enabled ?? true,
      ...(options.retry === undefined ? {} : { retry: options.retry }),
    })
  }

  return { usePagedList, useApiGet }
}

export function flattenPages<T>(data: InfiniteData<Paged<T>> | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}

/** Total matching rows as reported by the server (`meta.total` of the first page). */
export function pagedTotal<T>(data: InfiniteData<Paged<T>> | undefined): number | undefined {
  return data?.pages[0]?.meta.total
}
