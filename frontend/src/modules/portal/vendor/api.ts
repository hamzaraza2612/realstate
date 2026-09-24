import { useQuery } from '@tanstack/react-query'
import { portalApiClient } from '@/lib/portalApiClient'
import type { ApiEnvelope, MaintenanceRequestDto, PageMeta, PurchaseOrderDto } from '@/types/api'
import { createPortalCommonApi } from '../shared/portalCommon'

const PREFIX = '/portal/vendor'
const KEY = ['portal', 'vendor'] as const

export const {
  useDocuments,
  downloadDocument,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} = createPortalCommonApi(PREFIX, KEY)

export function useVendorPurchaseOrders(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'purchase-orders', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PurchaseOrderDto[]>>(`${PREFIX}/purchase-orders`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useVendorPurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, 'purchase-orders', id],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<PurchaseOrderDto>>(`${PREFIX}/purchase-orders/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export function useVendorAssignedWork(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'assigned-work', page, pageSize],
    queryFn: async () => {
      const response = await portalApiClient.get<ApiEnvelope<MaintenanceRequestDto[]>>(`${PREFIX}/assigned-work`, { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}
