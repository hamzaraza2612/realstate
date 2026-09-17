import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  CustomerDto,
  LeadDto,
  LeadPriority,
  LeadSource,
  LeadStatus,
  PageMeta,
} from '@/types/api'

const LEADS_KEY = ['crm', 'leads']

export interface LeadFilters {
  status?: LeadStatus
  priority?: LeadPriority
  source?: LeadSource
  assignedToUserId?: string
  unassignedOnly?: boolean
  search?: string
}

export function useLeads(page: number, filters: LeadFilters) {
  return useQuery({
    queryKey: [...LEADS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeadDto[]>>('/crm/leads', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: [...LEADS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeadDto>>(`/crm/leads/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface LeadRequest {
  fullName: string
  email: string | null
  phone: string | null
  companyName: string | null
  source: LeadSource
  priority: LeadPriority
  notes: string | null
  assignedToUserId: string | null
}

export interface UpdateLeadRequest {
  fullName: string
  email: string | null
  phone: string | null
  companyName: string | null
  status: LeadStatus
  priority: LeadPriority
  notes: string | null
}

function invalidateLeads(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: LEADS_KEY })
}

export function useCreateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LeadRequest) => {
      const response = await apiClient.post<ApiEnvelope<LeadDto>>('/crm/leads', payload)
      return response.data.data
    },
    onSuccess: () => invalidateLeads(queryClient),
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateLeadRequest }) => {
      const response = await apiClient.put<ApiEnvelope<LeadDto>>(`/crm/leads/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateLeads(queryClient),
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/crm/leads/${id}`)
    },
    onSuccess: () => invalidateLeads(queryClient),
  })
}

export function useAssignLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, assignedToUserId }: { id: string; assignedToUserId: string | null }) => {
      const response = await apiClient.post<ApiEnvelope<LeadDto>>(`/crm/leads/${id}/assign`, { assignedToUserId })
      return response.data.data
    },
    onSuccess: () => invalidateLeads(queryClient),
  })
}

export function useConvertLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<CustomerDto>>(`/crm/leads/${id}/convert`)
      return response.data.data
    },
    onSuccess: () => {
      invalidateLeads(queryClient)
      queryClient.invalidateQueries({ queryKey: ['crm', 'customers'] })
    },
  })
}
