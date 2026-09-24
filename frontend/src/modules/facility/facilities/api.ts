import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FacilityDto, FacilityOperatingStatus, FacilityType, PageMeta } from '@/types/api'

const FACILITIES_KEY = ['facility', 'facilities']

export interface FacilityFilters {
  type?: FacilityType
  status?: FacilityOperatingStatus
  search?: string
}

export function useFacilities(page: number, filters: FacilityFilters) {
  return useQuery({
    queryKey: [...FACILITIES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityDto[]>>('/facilities', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllFacilities(type?: FacilityType) {
  return useQuery({
    queryKey: [...FACILITIES_KEY, 'all', type],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityDto[]>>('/facilities', {
        params: { page: 1, pageSize: 200, type },
      })
      return response.data.data
    },
  })
}

export function useFacility(id: string | undefined) {
  return useQuery({
    queryKey: [...FACILITIES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityDto>>(`/facilities/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface FacilityRequest {
  code: string
  propertyId: string
  type: FacilityType
  name: string
  description: string | null
  addressLine: string | null
  city: string | null
  managerUserId: string | null
}

export interface UpdateFacilityRequest {
  name: string
  status: FacilityOperatingStatus
  description: string | null
  addressLine: string | null
  city: string | null
  managerUserId: string | null
}

function invalidateFacilities(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FACILITIES_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: FacilityRequest) => {
      const response = await apiClient.post<ApiEnvelope<FacilityDto>>('/facilities', payload)
      return response.data.data
    },
    onSuccess: () => invalidateFacilities(queryClient),
  })
}

export function useUpdateFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateFacilityRequest }) => {
      const response = await apiClient.put<ApiEnvelope<FacilityDto>>(`/facilities/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateFacilities(queryClient),
  })
}

export function useDeleteFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/facilities/${id}`)
    },
    onSuccess: () => invalidateFacilities(queryClient),
  })
}
