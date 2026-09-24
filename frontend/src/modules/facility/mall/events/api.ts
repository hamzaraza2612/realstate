import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FacilityEventDto, FacilityEventStatus } from '@/types/api'

const EVENTS_KEY = ['facility', 'mall', 'events']

export interface FacilityEventFilters {
  facilityId?: string
  status?: FacilityEventStatus
}

export function useFacilityEvents(filters: FacilityEventFilters) {
  return useQuery({
    queryKey: [...EVENTS_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityEventDto[]>>('/facility/mall/events', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface FacilityEventRequest {
  facilityId: string
  title: string
  startAt: string
  endAt: string
  location: string | null
  organizer: string | null
  notes: string | null
}

function invalidateEvents(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: EVENTS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
}

export function useCreateFacilityEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: FacilityEventRequest) => {
      const response = await apiClient.post<ApiEnvelope<FacilityEventDto>>('/facility/mall/events', payload)
      return response.data.data
    },
    onSuccess: () => invalidateEvents(queryClient),
  })
}

export function useUpdateFacilityEventStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FacilityEventStatus }) => {
      const response = await apiClient.post<ApiEnvelope<FacilityEventDto>>(`/facility/mall/events/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateEvents(queryClient),
  })
}
