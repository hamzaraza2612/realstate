import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, BookingResourceType, CoworkingBookingDto, CoworkingBookingStatus, PageMeta } from '@/types/api'

const BOOKINGS_KEY = ['facility', 'coworking', 'bookings']

export interface CoworkingBookingFilters {
  memberId?: string
  resourceType?: BookingResourceType
  resourceId?: string
  status?: CoworkingBookingStatus
}

export function useCoworkingBookings(page: number, filters: CoworkingBookingFilters) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingBookingDto[]>>('/facility/coworking/bookings', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useCoworkingBooking(id: string | undefined) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingBookingDto>>(`/facility/coworking/bookings/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CoworkingBookingRequest {
  memberId: string
  resourceType: BookingResourceType
  resourceId: string
  startAt: string
  endAt: string
  notes: string | null
}

function invalidateBookings(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateCoworkingBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CoworkingBookingRequest) => {
      const response = await apiClient.post<ApiEnvelope<CoworkingBookingDto>>('/facility/coworking/bookings', payload)
      return response.data.data
    },
    onSuccess: () => invalidateBookings(queryClient),
  })
}

export function useUpdateCoworkingBookingStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CoworkingBookingStatus }) => {
      const response = await apiClient.post<ApiEnvelope<CoworkingBookingDto>>(`/facility/coworking/bookings/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateBookings(queryClient),
  })
}
