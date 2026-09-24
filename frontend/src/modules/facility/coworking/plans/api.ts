import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MembershipPlanDto } from '@/types/api'

const PLANS_KEY = ['facility', 'coworking', 'plans']

export interface PlanFilters {
  facilityId?: string
  isActive?: boolean
}

export function usePlans(filters: PlanFilters) {
  return useQuery({
    queryKey: [...PLANS_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MembershipPlanDto[]>>('/facility/coworking/plans', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface PlanRequest {
  facilityId: string
  name: string
  durationDays: number
  price: number
  includedHoursCredits: number | null
}

export interface UpdatePlanRequest {
  name: string
  price: number
  includedHoursCredits: number | null
  isActive: boolean
}

function invalidatePlans(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PLANS_KEY })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: PlanRequest) => {
      const response = await apiClient.post<ApiEnvelope<MembershipPlanDto>>('/facility/coworking/plans', payload)
      return response.data.data
    },
    onSuccess: () => invalidatePlans(queryClient),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdatePlanRequest }) => {
      const response = await apiClient.put<ApiEnvelope<MembershipPlanDto>>(`/facility/coworking/plans/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidatePlans(queryClient),
  })
}
