import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ConstructionDashboardDto } from '@/types/api'

export function useConstructionDashboard() {
  return useQuery({
    queryKey: ['construction', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ConstructionDashboardDto>>('/construction/dashboard')
      return response.data.data
    },
  })
}
