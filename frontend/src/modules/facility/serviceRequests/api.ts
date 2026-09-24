import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MaintenancePriority, MaintenanceStatus, PageMeta, ServiceRequestCategory, ServiceRequestDto } from '@/types/api'

const SERVICE_REQUESTS_KEY = ['facility', 'service-requests']

export interface ServiceRequestFilters {
  facilityId?: string
  spaceId?: string
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  search?: string
}

export function useServiceRequests(page: number, filters: ServiceRequestFilters) {
  return useQuery({
    queryKey: [...SERVICE_REQUESTS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ServiceRequestDto[]>>('/facility/service-requests', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useServiceRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...SERVICE_REQUESTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ServiceRequestDto>>(`/facility/service-requests/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface ServiceRequestRequest {
  facilityId: string
  spaceId: string | null
  requesterCustomerId: string | null
  category: ServiceRequestCategory
  priority: MaintenancePriority
  description: string
  reportedDate: string
  assignedToUserId: string | null
  assignedVendorId: string | null
}

function invalidateServiceRequests(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SERVICE_REQUESTS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ServiceRequestRequest) => {
      const response = await apiClient.post<ApiEnvelope<ServiceRequestDto>>('/facility/service-requests', payload)
      return response.data.data
    },
    onSuccess: () => invalidateServiceRequests(queryClient),
  })
}

export interface UpdateServiceRequestStatusRequest {
  status: MaintenanceStatus
  resolutionNotes: string | null
}

export function useUpdateServiceRequestStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateServiceRequestStatusRequest }) => {
      const response = await apiClient.post<ApiEnvelope<ServiceRequestDto>>(`/facility/service-requests/${id}/status`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateServiceRequests(queryClient),
  })
}
