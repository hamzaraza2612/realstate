import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, SalesDashboardDto } from '@/types/api'

export function useSalesDashboard() {
  return useQuery({
    queryKey: ['sales', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesDashboardDto>>('/sales/dashboard')
      return response.data.data
    },
  })
}
