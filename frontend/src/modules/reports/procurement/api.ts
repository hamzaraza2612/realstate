import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PurchaseOrderExposureRow, PurchaseOrderStatusReportRow, ReceivedVsOrderedRow, VendorSpendRow } from '@/types/api'

const BASE = '/reports/procurement'

export function usePurchaseOrderExposure() {
  return useQuery({
    queryKey: ['reports', 'procurement', 'purchase-order-exposure'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseOrderExposureRow[]>>(`${BASE}/purchase-order-exposure`)
      return response.data.data
    },
  })
}

export function useReceivedVsOrdered(purchaseOrderId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'procurement', 'received-vs-ordered', purchaseOrderId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ReceivedVsOrderedRow[]>>(`${BASE}/received-vs-ordered`, {
        params: { purchaseOrderId },
      })
      return response.data.data
    },
  })
}

export interface VendorSpendFilters {
  from?: string
  to?: string
}

export function useVendorSpend(filters: VendorSpendFilters) {
  return useQuery({
    queryKey: ['reports', 'procurement', 'vendor-spend', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<VendorSpendRow[]>>(`${BASE}/vendor-spend`, { params: filters })
      return response.data.data
    },
  })
}

export function usePurchaseOrderStatusReport() {
  return useQuery({
    queryKey: ['reports', 'procurement', 'status'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PurchaseOrderStatusReportRow[]>>(`${BASE}/status`)
      return response.data.data
    },
  })
}
