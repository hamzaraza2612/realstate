import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, SpaceDto, SpaceStatus, SpaceType } from '@/types/api'

const SPACES_KEY = ['facility', 'spaces']

export interface SpaceFilters {
  facilityId?: string
  type?: SpaceType
  status?: SpaceStatus
  search?: string
}

export function useSpaces(page: number, filters: SpaceFilters) {
  return useQuery({
    queryKey: [...SPACES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SpaceDto[]>>('/facility/spaces', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useSpacesByFacility(facilityId: string | undefined, type?: SpaceType) {
  return useQuery({
    queryKey: [...SPACES_KEY, 'by-facility', facilityId, type],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SpaceDto[]>>('/facility/spaces', {
        params: { facilityId, type, page: 1, pageSize: 200 },
      })
      return response.data.data
    },
    enabled: !!facilityId,
  })
}

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: [...SPACES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SpaceDto>>(`/facility/spaces/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface SpaceRequest {
  facilityId: string
  propertyUnitId: string | null
  buildingBlock: string | null
  code: string
  type: SpaceType
  areaSize: number | null
  capacity: number | null
  rate: number | null
  metadataJson: string | null
}

export interface UpdateSpaceRequest {
  buildingBlock: string | null
  code: string
  type: SpaceType
  areaSize: number | null
  capacity: number | null
  rate: number | null
  metadataJson: string | null
}

function invalidateSpaces(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SPACES_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'facilities'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SpaceRequest) => {
      const response = await apiClient.post<ApiEnvelope<SpaceDto>>('/facility/spaces', payload)
      return response.data.data
    },
    onSuccess: () => invalidateSpaces(queryClient),
  })
}

export function useUpdateSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateSpaceRequest }) => {
      const response = await apiClient.put<ApiEnvelope<SpaceDto>>(`/facility/spaces/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateSpaces(queryClient),
  })
}

export function useUpdateSpaceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SpaceStatus }) => {
      const response = await apiClient.post<ApiEnvelope<SpaceDto>>(`/facility/spaces/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateSpaces(queryClient),
  })
}

export function useDeleteSpace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/facility/spaces/${id}`)
    },
    onSuccess: () => invalidateSpaces(queryClient),
  })
}
