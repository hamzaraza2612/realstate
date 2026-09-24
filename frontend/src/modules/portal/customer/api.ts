import { useQuery } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type { ApiEnvelope, BookingDto, PageMeta, PaymentDto, PaymentPlanDto, PortalBookingPaymentEntry } from '@/types/api'
import { createPortalCommonApi } from '../shared/portalCommon'

const PREFIX = '/portal/customer'
const KEY = ['portal', 'customer'] as const

export const {
  useDocuments,
  downloadDocument,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} = createPortalCommonApi(PREFIX, KEY)

export function useCustomerBookings(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'bookings', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<BookingDto[]>>(`${PREFIX}/bookings`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useCustomerBooking(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'bookings', id],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<BookingDto>>(`${PREFIX}/bookings/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useCustomerPaymentPlan(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'bookings', bookingId, 'payment-plan'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PaymentPlanDto>>(`${PREFIX}/bookings/${bookingId}/payment-plan`)
      return response.data.data
    },
    enabled: !!bookingId,
    retry: false,
  })
}

export function useCustomerBookingPayments(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'bookings', bookingId, 'payments'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PaymentDto[]>>(`${PREFIX}/bookings/${bookingId}/payments`)
      return response.data.data
    },
    enabled: !!bookingId,
  })
}

/** All of the customer's payments across every booking — for the portal-wide Payments page. */
export function useCustomerPayments() {
  return useQuery({
    queryKey: [...KEY, 'payments'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PortalBookingPaymentEntry[]>>(`${PREFIX}/payments`)
      return response.data.data
    },
  })
}
