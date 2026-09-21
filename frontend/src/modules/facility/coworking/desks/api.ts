import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, DeskDto, DeskStatus, DeskType } from '@/types/api'

const DESKS_KEY = ['facility', 'coworking', 'desks']

export interface DeskFilters {
  spaceId?: string
  status?: DeskStatus
}

export function useDesks(filters: DeskFilters) {
  return useQuery({
    queryKey: [...DESKS_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<DeskDto[]>>('/facility/coworking/desks', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface DeskRequest {
  spaceId: string
  code: string
  type: DeskType
}

export interface UpdateDeskRequest {
  code: string
  type: DeskType
  status: DeskStatus
}

function invalidateDesks(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DESKS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateDesk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: DeskRequest) => {
      const response = await apiClient.post<ApiEnvelope<DeskDto>>('/facility/coworking/desks', payload)
      return response.data.data
    },
    onSuccess: () => invalidateDesks(queryClient),
  })
}

export function useUpdateDesk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDeskRequest }) => {
      const response = await apiClient.put<ApiEnvelope<DeskDto>>(`/facility/coworking/desks/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateDesks(queryClient),
  })
}
