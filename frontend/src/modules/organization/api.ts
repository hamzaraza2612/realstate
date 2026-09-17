import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, OrganizationDto } from '@/types/api'

const ORG_KEY = ['organization', 'me']

export function useCurrentOrganization() {
  return useQuery({
    queryKey: ORG_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OrganizationDto>>('/organizations/me')
      return response.data.data
    },
  })
}

export interface UpdateOrganizationRequest {
  name: string
  contactEmail: string | null
  contactPhone: string | null
  timezone: string
}

export function useUpdateCurrentOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateOrganizationRequest) => {
      const response = await apiClient.put<ApiEnvelope<OrganizationDto>>('/organizations/me', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_KEY }),
  })
}
