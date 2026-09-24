import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type {
  ApiEnvelope,
  LeaseDto,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRequestDto,
  PageMeta,
  PortalLeasePaymentEntry,
  RentPaymentDto,
  RentScheduleDto,
  SecurityDepositDto,
} from '@/types/api'
import { createPortalCommonApi } from '../shared/portalCommon'

const PREFIX = '/portal/tenant'
const KEY = ['portal', 'tenant'] as const

export const {
  useDocuments,
  downloadDocument,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} = createPortalCommonApi(PREFIX, KEY)

export function useTenantLeases(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'leases', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<LeaseDto[]>>(`${PREFIX}/leases`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useTenantLease(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'leases', id],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<LeaseDto>>(`${PREFIX}/leases/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useTenantRentSchedule(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'leases', leaseId, 'rent-schedule'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<RentScheduleDto[]>>(`${PREFIX}/leases/${leaseId}/rent-schedule`)
      return response.data.data
    },
    enabled: !!leaseId,
  })
}

export function useTenantLeasePayments(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'leases', leaseId, 'payments'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<RentPaymentDto[]>>(`${PREFIX}/leases/${leaseId}/payments`)
      return response.data.data
    },
    enabled: !!leaseId,
  })
}

export function useTenantSecurityDeposit(leaseId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'leases', leaseId, 'security-deposit'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<SecurityDepositDto>>(`${PREFIX}/leases/${leaseId}/security-deposit`)
      return response.data.data
    },
    enabled: !!leaseId,
    retry: false,
  })
}

/** All of the tenant's rent payments across every lease — for the portal-wide Payments view. */
export function useTenantPayments() {
  return useQuery({
    queryKey: [...KEY, 'payments'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PortalLeasePaymentEntry[]>>(`${PREFIX}/payments`)
      return response.data.data
    },
  })
}

export function useTenantMaintenanceRequests(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'maintenance-requests', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<MaintenanceRequestDto[]>>(`${PREFIX}/maintenance-requests`, {
        params: { page, pageSize },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface CreateTenantMaintenanceRequest {
  leaseId: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  description: string
}

export function useCreateTenantMaintenanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTenantMaintenanceRequest) => {
      const response = await portalApiClient.post<ApiEnvelope<MaintenanceRequestDto>>(`${PREFIX}/maintenance-requests`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, 'maintenance-requests'] }),
  })
}
