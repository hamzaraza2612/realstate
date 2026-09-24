import { useQuery } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type {
  ApiEnvelope,
  MaintenanceRequestDto,
  OverdueRentRow,
  OwnerPropertyDetailDto,
  OwnerPropertyDto,
  PageMeta,
  PropertyRevenueRow,
  RentCollectedRow,
} from '@/types/api'
import { createPortalCommonApi } from '../shared/portalCommon'

const PREFIX = '/portal/owner'
const KEY = ['portal', 'owner'] as const

export const {
  useDocuments,
  downloadDocument,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} = createPortalCommonApi(PREFIX, KEY)

export function useOwnerProperties() {
  return useQuery({
    queryKey: [...KEY, 'properties'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<OwnerPropertyDto[]>>(`${PREFIX}/properties`)
      return response.data.data
    },
  })
}

export function useOwnerProperty(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'properties', id],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<OwnerPropertyDetailDto>>(`${PREFIX}/properties/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface OwnerReportFilters {
  from?: string
  to?: string
}

export function useOwnerRentCollected(filters: OwnerReportFilters) {
  return useQuery({
    queryKey: [...KEY, 'rent-collected', filters],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<RentCollectedRow[]>>(`${PREFIX}/rent-collected`, { params: filters })
      return response.data.data
    },
  })
}

export function useOwnerOverdueRent() {
  return useQuery({
    queryKey: [...KEY, 'overdue-rent'],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<OverdueRentRow[]>>(`${PREFIX}/overdue-rent`)
      return response.data.data
    },
  })
}

export function useOwnerRevenue(filters: OwnerReportFilters) {
  return useQuery({
    queryKey: [...KEY, 'revenue', filters],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PropertyRevenueRow[]>>(`${PREFIX}/revenue`, { params: filters })
      return response.data.data
    },
  })
}

export function useOwnerMaintenanceRequests(page: number, pageSize = 20) {
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
