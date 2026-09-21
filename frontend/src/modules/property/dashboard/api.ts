import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PropertyDashboardDto } from '@/types/api'

export function usePropertyDashboard() {
  return useQuery({
    queryKey: ['property', 'dashboard'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyDashboardDto>>('/property/dashboard')
      return response.data.data
    },
  })
}
