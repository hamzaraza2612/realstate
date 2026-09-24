import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MallDashboardDto } from '@/types/api'

export function useMallDashboard(facilityId: string | undefined) {
  return useQuery({
    queryKey: ['facility', 'mall-dashboard', facilityId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MallDashboardDto>>('/facility/mall/dashboard', {
        params: { facilityId },
      })
      return response.data.data
    },
  })
}
