import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FacilityDashboardDto } from '@/types/api'

export function useFacilityDashboard() {
  return useQuery({
    queryKey: ['facility', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityDashboardDto>>('/facility/dashboard')
      return response.data.data
    },
  })
}
