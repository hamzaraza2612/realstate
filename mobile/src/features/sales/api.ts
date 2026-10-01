import { useApiGet, usePagedList } from '@/api/paging'
import type { BookingDto, BookingStatus, PaymentDto, PaymentPlanDto } from '@/types/modules'

/**
 * Sales bookings — the endpoints the web `modules/sales` pages call:
 *   GET /sales/bookings?search=&status=&customerId=&page=&pageSize=   (sales.booking.view)
 *   GET /sales/bookings/{id}                                           (sales.booking.view)
 *   GET /sales/bookings/{id}/payment-plan  → plan + installments (404 when none; only fetched
 *       when the booking says `hasPaymentPlan`)                        (sales.booking.view)
 *   GET /sales/bookings/{id}/payments      → all receipts for that one booking (the backend
 *       returns this per-booking collection unpaged)                   (sales.booking.view)
 */

export const SALES_KEY = ['sales']

export function useBookings(params: { search?: string; status?: BookingStatus; customerId?: string }, enabled = true) {
  return usePagedList<BookingDto>([...SALES_KEY, 'bookings'], '/sales/bookings', params, { enabled })
}

export function useBooking(id: string) {
  return useApiGet<BookingDto>([...SALES_KEY, 'bookings', 'detail', id], `/sales/bookings/${id}`)
}

export function usePaymentPlan(bookingId: string, enabled: boolean) {
  return useApiGet<PaymentPlanDto>([...SALES_KEY, 'bookings', 'plan', bookingId], `/sales/bookings/${bookingId}/payment-plan`, { enabled })
}

export function useBookingPayments(bookingId: string) {
  return useApiGet<PaymentDto[]>([...SALES_KEY, 'bookings', 'payments', bookingId], `/sales/bookings/${bookingId}/payments`)
}
