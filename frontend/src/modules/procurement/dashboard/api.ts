import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ProcurementDashboardDto } from '@/types/api'

export function useProcurementDashboard() {
  return useQuery({
    queryKey: ['procurement', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProcurementDashboardDto>>('/procurement/dashboard')
      return response.data.data
    },
  })
}
