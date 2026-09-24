import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type { ApiEnvelope, DocumentDto, NotificationCategory, NotificationDto, PageMeta } from '@/types/api'

export interface PortalNotificationFilters {
  unreadOnly?: boolean
  category?: NotificationCategory
}

function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Every portal area (`/portal/customer`, `/portal/tenant`, `/portal/owner`, `/portal/vendor`,
 * `/portal/member`) exposes an identically-shaped `documents` + `notifications` surface. Rather
 * than duplicating the same react-query hooks five times, each portal's own `api.ts` calls this
 * factory once with its own route prefix and query-key namespace.
 */
export function createPortalCommonApi(prefix: string, keyBase: readonly string[]) {
  function useDocuments() {
    return useQuery({
      queryKey: [...keyBase, 'documents'],
      queryFn: async () => {
        const response = await portalApiClient.get<ApiEnvelope<DocumentDto[]>>(`${prefix}/documents`)
        return response.data.data
      },
    })
  }

  /** Imperative download helper — fetches the file as a blob and triggers a browser save. */
  async function downloadDocument(id: string, version?: number, fileName?: string) {
    const response = await portalApiClient.get(`${prefix}/documents/${id}/download`, {
      params: version ? { version } : undefined,
      responseType: 'blob',
    })
    const blobUrl = window.URL.createObjectURL(response.data as Blob)
    const link = window.document.createElement('a')
    link.href = blobUrl
    link.download = fileName ?? fileNameFromContentDisposition(response.headers['content-disposition']) ?? 'document'
    window.document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  }

  function useNotifications(page: number, filters: PortalNotificationFilters) {
    return useQuery({
      queryKey: [...keyBase, 'notifications', 'list', page, filters],
      queryFn: async () => {
        const response = await portalApiClient.get<ApiEnvelope<NotificationDto[]>>(`${prefix}/notifications`, {
          params: { page, pageSize: 20, ...filters },
        })
        return { items: response.data.data, meta: response.data.meta as PageMeta }
      },
      placeholderData: (prev) => prev,
    })
  }

  function useUnreadNotificationCount() {
    return useQuery({
      queryKey: [...keyBase, 'notifications', 'unread-count'],
      queryFn: async () => {
        const response = await portalApiClient.get<ApiEnvelope<number>>(`${prefix}/notifications/unread-count`)
        return response.data.data
      },
      refetchInterval: 30_000,
    })
  }

  function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
    queryClient.invalidateQueries({ queryKey: [...keyBase, 'notifications'] })
  }

  function useMarkNotificationRead() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async (id: string) => {
        const response = await portalApiClient.post<ApiEnvelope<NotificationDto>>(`${prefix}/notifications/${id}/read`)
        return response.data.data
      },
      onSuccess: () => invalidateNotifications(queryClient),
    })
  }

  function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()
    return useMutation({
      mutationFn: async () => {
        await portalApiClient.post(`${prefix}/notifications/read-all`)
      },
      onSuccess: () => invalidateNotifications(queryClient),
    })
  }

  return {
    useDocuments,
    downloadDocument,
    useNotifications,
    useUnreadNotificationCount,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
  }
}

export type PortalCommonApi = ReturnType<typeof createPortalCommonApi>
