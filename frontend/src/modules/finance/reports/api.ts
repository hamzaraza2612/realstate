import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, TrialBalanceDto } from '@/types/api'

export function useTrialBalance() {
  return useQuery({
    queryKey: ['finance', 'reports', 'trial-balance'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TrialBalanceDto>>('/finance/reports/trial-balance')
      return response.data.data
    },
  })
}
