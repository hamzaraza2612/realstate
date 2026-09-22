import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, NotificationCategory, NotificationDto, NotificationPreferenceDto, PageMeta } from '@/types/api'

const NOTIFICATIONS_KEY = ['notifications']

export interface NotificationFilters {
  unreadOnly?: boolean
  category?: NotificationCategory
}

export function useNotifications(page: number, filters: NotificationFilters) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<NotificationDto[]>>('/notifications', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

/** Most recent notifications for the bell dropdown, polled periodically. */
export function useRecentNotifications() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'recent'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<NotificationDto[]>>('/notifications', {
        params: { page: 1, pageSize: 10 },
      })
      return response.data.data
    },
    refetchInterval: 30_000,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<number>>('/notifications/unread-count')
      return response.data.data
    },
    refetchInterval: 30_000,
  })
}

function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<NotificationDto>>(`/notifications/${id}/read`)
      return response.data.data
    },
    onSuccess: () => invalidateNotifications(queryClient),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all')
    },
    onSuccess: () => invalidateNotifications(queryClient),
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'preferences'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<NotificationPreferenceDto[]>>('/notifications/preferences')
      return response.data.data
    },
  })
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: NotificationPreferenceDto) => {
      const response = await apiClient.put<ApiEnvelope<NotificationPreferenceDto>>('/notifications/preferences', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY, 'preferences'] }),
  })
}

/**
 * Best-effort deep link for a notification's related entity. Only entity types with a known
 * destination navigate; everything else returns null (the caller should still mark it read).
 */
export function resolveNotificationLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null
  switch (entityType) {
    case 'Expense':
      return '/construction/expenses'
    case 'Booking':
      return `/sales/bookings/${entityId}`
    case 'PurchaseOrder':
      return `/procurement/purchase-orders/${entityId}`
    default:
      return null
  }
}
