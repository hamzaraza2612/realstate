import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FinanceDashboardDto } from '@/types/api'

export function useFinanceDashboard() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FinanceDashboardDto>>('/finance/dashboard')
      return response.data.data
    },
  })
}
