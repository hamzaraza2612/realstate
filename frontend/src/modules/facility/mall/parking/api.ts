import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ParkingAllocationDto, ParkingAllocationStatus, ParkingSpaceDto, ParkingSpaceStatus } from '@/types/api'

const PARKING_SPACES_KEY = ['facility', 'mall', 'parking-spaces']
const PARKING_ALLOCATIONS_KEY = ['facility', 'mall', 'parking-allocations']

export interface ParkingSpaceFilters {
  facilityId?: string
  status?: ParkingSpaceStatus
}

export function useParkingSpaces(filters: ParkingSpaceFilters) {
  return useQuery({
    queryKey: [...PARKING_SPACES_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ParkingSpaceDto[]>>('/facility/mall/parking/spaces', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface ParkingSpaceRequest {
  facilityId: string
  code: string
}

function invalidateParking(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PARKING_SPACES_KEY })
  queryClient.invalidateQueries({ queryKey: PARKING_ALLOCATIONS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
}

export function useCreateParkingSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ParkingSpaceRequest) => {
      const response = await apiClient.post<ApiEnvelope<ParkingSpaceDto>>('/facility/mall/parking/spaces', payload)
      return response.data.data
    },
    onSuccess: () => invalidateParking(queryClient),
  })
}

export interface ParkingAllocationFilters {
  parkingSpaceId?: string
  status?: ParkingAllocationStatus
}

export function useParkingAllocations(page: number, filters: ParkingAllocationFilters) {
  return useQuery({
    queryKey: [...PARKING_ALLOCATIONS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ParkingAllocationDto[]>>('/facility/mall/parking/allocations', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface ParkingAllocationRequest {
  parkingSpaceId: string
  rentalTenantId: string | null
  vehicleReference: string | null
  startDate: string
  amount: number
  notes: string | null
}

export function useCreateParkingAllocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ParkingAllocationRequest) => {
      const response = await apiClient.post<ApiEnvelope<ParkingAllocationDto>>('/facility/mall/parking/allocations', payload)
      return response.data.data
    },
    onSuccess: () => invalidateParking(queryClient),
  })
}

export function useEndParkingAllocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<ParkingAllocationDto>>(`/facility/mall/parking/allocations/${id}/end`)
      return response.data.data
    },
    onSuccess: () => invalidateParking(queryClient),
  })
}
