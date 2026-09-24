import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, CoworkingMemberDto, PageMeta } from '@/types/api'

const MEMBERS_KEY = ['facility', 'coworking', 'members']

export interface MemberFilters {
  isActive?: boolean
  search?: string
}

export function useMembers(page: number, filters: MemberFilters) {
  return useQuery({
    queryKey: [...MEMBERS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingMemberDto[]>>('/facility/coworking/members', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllMembers() {
  return useQuery({
    queryKey: [...MEMBERS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingMemberDto[]>>('/facility/coworking/members', {
        params: { page: 1, pageSize: 200, isActive: true },
      })
      return response.data.data
    },
  })
}

export interface MemberRequest {
  customerId: string | null
  fullName: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

export interface UpdateMemberRequest {
  isActive: boolean
  notes: string | null
}

function invalidateMembers(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: MEMBERS_KEY })
  queryClient.invalidateQueries({ queryKey: ['facility', 'coworking-dashboard'] })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: MemberRequest) => {
      const response = await apiClient.post<ApiEnvelope<CoworkingMemberDto>>('/facility/coworking/members', payload)
      return response.data.data
    },
    onSuccess: () => invalidateMembers(queryClient),
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMemberRequest }) => {
      const response = await apiClient.put<ApiEnvelope<CoworkingMemberDto>>(`/facility/coworking/members/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateMembers(queryClient),
  })
}
