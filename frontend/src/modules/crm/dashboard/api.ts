import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, CrmDashboardDto } from '@/types/api'

export function useCrmDashboard() {
  return useQuery({
    queryKey: ['crm', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CrmDashboardDto>>('/crm/dashboard')
      return response.data.data
    },
  })
}
