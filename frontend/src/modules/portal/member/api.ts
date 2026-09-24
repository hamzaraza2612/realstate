import { useQuery } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type { ApiEnvelope, CoworkingBookingDto, MembershipDto, PageMeta } from '@/types/api'
import { createPortalCommonApi } from '../shared/portalCommon'

const PREFIX = '/portal/member'
const KEY = ['portal', 'member'] as const

export const {
  useDocuments,
  downloadDocument,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} = createPortalCommonApi(PREFIX, KEY)

export function useActiveMembership() {
  return useQuery({
    queryKey: [...KEY, 'membership'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<MembershipDto>>(`${PREFIX}/membership`)
      return response.data.data
    },
    retry: false,
  })
}

export function useMemberships(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'memberships', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<MembershipDto[]>>(`${PREFIX}/memberships`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMemberBookings(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'bookings', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<CoworkingBookingDto[]>>(`${PREFIX}/bookings`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMemberBooking(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'bookings', id],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<CoworkingBookingDto>>(`${PREFIX}/bookings/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}
