import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, RentalDashboardDto } from '@/types/api'

export function useRentalDashboard() {
  return useQuery({
    queryKey: ['property', 'rental-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentalDashboardDto>>('/property/rental-dashboard')
      return response.data.data
    },
  })
}
