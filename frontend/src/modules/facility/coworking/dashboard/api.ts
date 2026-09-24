import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, CoworkingDashboardDto } from '@/types/api'

export function useCoworkingDashboard(facilityId: string | undefined) {
  return useQuery({
    queryKey: ['facility', 'coworking-dashboard', facilityId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingDashboardDto>>('/facility/coworking/dashboard', {
        params: { facilityId },
      })
      return response.data.data
    },
  })
}
