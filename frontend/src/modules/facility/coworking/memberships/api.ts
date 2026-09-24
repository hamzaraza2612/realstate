import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, MembershipDto, MembershipStatus, PageMeta } from '@/types/api'

const MEMBERSHIPS_KEY = ['facility', 'coworking', 'memberships']

export interface MembershipFilters {
  memberId?: string
  planId?: string
  status?: MembershipStatus
}

export function useMemberships(page: number, filters: MembershipFilters) {
  return useQuery({
    queryKey: [...MEMBERSHIPS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MembershipDto[]>>('/facility/coworking/memberships', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useMembership(id: string | undefined) {
  return useQuery({
    queryKey: [...MEMBERSHIPS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MembershipDto>>(`/facility/coworking/memberships/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface MembershipRequest {
  memberId: string
  planId: string
  startDate: string
}

function invalidateMemberships(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MEMBERSHIPS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking', 'members'] })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MembershipRequest) => {
      const response = await apiClient.post<ApiEnvelope<MembershipDto>>('/facility/coworking/memberships', payload)
      return response.data.data
    },
    onSuccess: () => invalidateMemberships(queryClient),
  })
}

export function useUpdateMembershipStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MembershipStatus }) => {
      const response = await apiClient.post<ApiEnvelope<MembershipDto>>(`/facility/coworking/memberships/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => invalidateMemberships(queryClient),
  })
}
