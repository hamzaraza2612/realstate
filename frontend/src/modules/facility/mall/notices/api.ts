import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, TenantNoticeDto, TenantNoticeStatus } from '@/types/api'

const NOTICES_KEY = ['facility', 'mall', 'notices']

export interface TenantNoticeFilters {
  facilityId?: string
  rentalTenantId?: string
  status?: TenantNoticeStatus
}

export function useTenantNotices(filters: TenantNoticeFilters) {
  return useQuery({
    queryKey: [...NOTICES_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantNoticeDto[]>>('/facility/mall/notices', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface TenantNoticeRequest {
  facilityId: string
  rentalTenantId: string | null
  subject: string
  content: string
  noticeDate: string
}

function invalidateNotices(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
}

export function useCreateTenantNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TenantNoticeRequest) => {
      const response = await apiClient.post<ApiEnvelope<TenantNoticeDto>>('/facility/mall/notices', payload)
      return response.data.data
    },
    onSuccess: () => invalidateNotices(queryClient),
  })
}

export function useUpdateTenantNoticeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenantNoticeStatus }) => {
      const response = await apiClient.post<ApiEnvelope<TenantNoticeDto>>(`/facility/mall/notices/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateNotices(queryClient),
  })
}
