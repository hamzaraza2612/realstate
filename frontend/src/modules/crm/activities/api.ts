import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ActivityDto, ActivityType, ApiEnvelope, PageMeta } from '@/types/api'

const ACTIVITIES_KEY = ['crm', 'activities']

export interface ActivityFilters {
  leadId?: string
  customerId?: string
}

export function useActivities(filters: ActivityFilters, page = 1) {
  return useQuery({
    queryKey: [...ACTIVITIES_KEY, filters, page],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ActivityDto[]>>('/crm/activities', {
        params: { page, pageSize: 50, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    enabled: !!(filters.leadId || filters.customerId),
  })
}

export interface CreateActivityRequest {
  type: ActivityType
  subject: string
  description: string | null
  dueDate: string | null
  leadId: string | null
  customerId: string | null
  assignedToUserId: string | null
}

function invalidateActivities(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ACTIVITIES_KEY })
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateActivityRequest) => {
      const response = await apiClient.post<ApiEnvelope<ActivityDto>>('/crm/activities', payload)
      return response.data.data
    },
    onSuccess: () => invalidateActivities(queryClient),
  })
}

export function useCompleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<ActivityDto>>(`/crm/activities/${id}/complete`)
      return response.data.data
    },
    onSuccess: () => invalidateActivities(queryClient),
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/crm/activities/${id}`)
    },
    onSuccess: () => invalidateActivities(queryClient),
  })
}
