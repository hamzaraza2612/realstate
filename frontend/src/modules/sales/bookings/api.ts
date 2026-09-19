import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  BookingDto,
  BookingStatus,
  InstallmentFrequency,
  PageMeta,
  PaymentDto,
  PaymentMethod,
  PaymentPlanDto,
  PaymentPlanType,
} from '@/types/api'

const BOOKINGS_KEY = ['sales', 'bookings']

export interface BookingFilters {
  projectId?: string
  customerId?: string
  salesAgentUserId?: string
  status?: BookingStatus
  search?: string
}

export function useBookings(page: number, filters: BookingFilters) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingDto[]>>('/sales/bookings', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingDto>>(`/sales/bookings/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CreateBookingRequest {
  customerId: string
  projectId: string
  inventoryUnitId: string
  salesAgentUserId: string
  bookingDate: string
  totalPrice: number
  discount: number
  notes: string | null
}

export interface UpdateBookingRequest {
  salesAgentUserId: string
  bookingDate: string
  totalPrice: number
  discount: number
  notes: string | null
}

function invalidateBookings(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
  queryClient.invalidateQueries({ queryKey: ['inventory'] })
  queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard'] })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateBookingRequest) => {
      const response = await apiClient.post<ApiEnvelope<BookingDto>>('/sales/bookings', payload)
      return response.data.data
    },
    onSuccess: () => invalidateBookings(queryClient),
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateBookingRequest }) => {
      const response = await apiClient.put<ApiEnvelope<BookingDto>>(`/sales/bookings/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateBookings(queryClient),
  })
}

function useBookingAction(action: 'submit' | 'approve' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<BookingDto>>(`/sales/bookings/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidateBookings(queryClient),
  })
}

export const useSubmitBooking = () => useBookingAction('submit')
export const useApproveBooking = () => useBookingAction('approve')
export const useCancelBooking = () => useBookingAction('cancel')

// --- Payment plan ---

const PAYMENT_PLAN_KEY = ['sales', 'payment-plan']

export function usePaymentPlan(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...PAYMENT_PLAN_KEY, bookingId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PaymentPlanDto>>(`/sales/bookings/${bookingId}/payment-plan`)
      return response.data.data
    },
    enabled: !!bookingId,
    retry: false,
  })
}

export interface InstallmentScheduleEntry {
  dueDate: string
  value: number
}

export interface CreatePaymentPlanRequest {
  name: string
  bookingAmount: number
  downPayment: number
  planType: PaymentPlanType
  frequency: InstallmentFrequency
  numberOfInstallments: number
  gracePeriodDays: number
  customSchedule: InstallmentScheduleEntry[] | null
}

export function useCreatePaymentPlan(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreatePaymentPlanRequest) => {
      const response = await apiClient.post<ApiEnvelope<PaymentPlanDto>>(`/sales/bookings/${bookingId}/payment-plan`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PAYMENT_PLAN_KEY, bookingId] })
      invalidateBookings(queryClient)
    },
  })
}

// --- Payments ---

const PAYMENTS_KEY = ['sales', 'payments']

export function usePayments(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, bookingId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PaymentDto[]>>(`/sales/bookings/${bookingId}/payments`)
      return response.data.data
    },
    enabled: !!bookingId,
  })
}

export interface RecordPaymentRequest {
  installmentId: string
  amount: number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  notes: string | null
}

export function useRecordPayment(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecordPaymentRequest) => {
      const response = await apiClient.post<ApiEnvelope<PaymentDto>>(`/sales/bookings/${bookingId}/payments`, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...PAYMENT_PLAN_KEY, bookingId] })
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, bookingId] })
      queryClient.invalidateQueries({ queryKey: ['sales', 'dashboard'] })
    },
  })
}
