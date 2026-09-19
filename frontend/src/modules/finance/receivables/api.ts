import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, InstallmentStatus, PageMeta, ReceivableDto } from '@/types/api'

export interface ReceivableFilters {
  customerId?: string
  status?: InstallmentStatus
  overdueOnly?: boolean
  search?: string
}

export function useReceivables(page: number, filters: ReceivableFilters) {
  return useQuery({
    queryKey: ['finance', 'receivables', page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ReceivableDto[]>>('/finance/receivables', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}
