import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MaintenanceCategory, MaintenancePriority, MaintenanceRequestDto, MaintenanceStatus, PageMeta } from '@/types/api'

const MAINTENANCE_KEY = ['property', 'maintenance-requests']

export interface MaintenanceFilters {
  propertyId?: string
  unitId?: string
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  search?: string
}

export function useMaintenanceRequests(page: number, filters: MaintenanceFilters) {
  return useQuery({
    queryKey: [...MAINTENANCE_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaintenanceRequestDto[]>>('/property/maintenance-requests', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMaintenanceRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...MAINTENANCE_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaintenanceRequestDto>>(`/property/maintenance-requests/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface MaintenanceRequestRequest {
  propertyId: string | null
  unitId: string | null
  rentalTenantId: string | null
  facilityId: string | null
  spaceId: string | null
  slaHours: number | null
  category: MaintenanceCategory
  priority: MaintenancePriority
  description: string
  reportedDate: string
  assignedToUserId: string | null
  assignedVendorId: string | null
}

function invalidateMaintenance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MAINTENANCE_KEY })
  queryClient.invalidateQueries({ queryKey: ['property', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'dashboard'] })
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MaintenanceRequestRequest) => {
      const response = await apiClient.post<ApiEnvelope<MaintenanceRequestDto>>('/property/maintenance-requests', payload)
      return response.data.data
    },
    onSuccess: () => invalidateMaintenance(queryClient),
  })
}

export interface AssignMaintenanceRequest {
  assignedToUserId: string | null
  assignedVendorId: string | null
}

export function useAssignMaintenanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: AssignMaintenanceRequest }) => {
      const response = await apiClient.post<ApiEnvelope<MaintenanceRequestDto>>(`/property/maintenance-requests/${id}/assign`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateMaintenance(queryClient),
  })
}

export interface UpdateMaintenanceStatusRequest {
  status: MaintenanceStatus
  resolutionNotes: string | null
  completionDate: string | null
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMaintenanceStatusRequest }) => {
      const response = await apiClient.post<ApiEnvelope<MaintenanceRequestDto>>(`/property/maintenance-requests/${id}/status`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateMaintenance(queryClient),
  })
}
