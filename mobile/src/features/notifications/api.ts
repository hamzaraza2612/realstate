import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import type { ApiEnvelope, NotificationDto, PageMeta } from '@/types/api'

/** Internal notifications — port of the web `frontend/src/modules/notifications/api.ts` (same
 * endpoints/params). The list is an infinite query (page-by-page "Load more") so a long history is
 * never loaded into memory at once. Portal notifications live on each portal controller and are
 * Phase 3 work. */

const NOTIFICATIONS_KEY = ['notifications']
const PAGE_SIZE = 20

export function useNotificationsInfinite(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', { unreadOnly }],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<ApiEnvelope<NotificationDto[]>>('/notifications', {
        params: { page: pageParam, pageSize: PAGE_SIZE, unreadOnly: unreadOnly || undefined },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    getNextPageParam: (last) => (last.meta.page * last.meta.pageSize < last.meta.total ? last.meta.page + 1 : undefined),
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<number>>('/notifications/unread-count')
      return response.data.data
    },
    refetchInterval: 60_000,
  })
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<NotificationDto>>(`/notifications/${id}/read`)
      return response.data.data
    },
    onSuccess: invalidate,
  })
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all')
    },
    onSuccess: invalidate,
  })
}
