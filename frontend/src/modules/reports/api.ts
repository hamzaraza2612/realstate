import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ExecutiveDashboardDto } from '@/types/api'

export function useExecutiveDashboard(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'executive', from, to],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExecutiveDashboardDto>>('/reports/executive', {
        params: { from: from || undefined, to: to || undefined },
      })
      return response.data.data
    },
  })
}
