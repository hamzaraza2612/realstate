import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { useApiGet, usePagedList } from '@/api/paging'
import type { ApiEnvelope } from '@/types/api'
import type { ActivityDto, ActivityType, CustomerDto, LeadDto, LeadStatus } from '@/types/modules'

/**
 * CRM — the existing endpoints the web `modules/crm` pages call:
 *   GET /crm/leads?search=&status=&page=&pageSize=      (crm.lead.view)
 *   GET /crm/leads/{id}                                  (crm.lead.view)
 *   GET /crm/customers?search=&page=&pageSize=           (crm.customer.view)
 *   GET /crm/customers/{id}                              (crm.customer.view)
 *   GET /crm/activities?leadId=|customerId=&page=…       (crm.activity.view)
 *   POST /crm/activities, POST /crm/activities/{id}/complete   (crm.activity.manage)
 */

export const CRM_KEY = ['crm']

export function useLeads(search: string, status: LeadStatus | undefined) {
  return usePagedList<LeadDto>([...CRM_KEY, 'leads'], '/crm/leads', { search, status })
}

export function useLead(id: string) {
  return useApiGet<LeadDto>([...CRM_KEY, 'leads', 'detail', id], `/crm/leads/${id}`)
}

export function useCustomers(search: string) {
  return usePagedList<CustomerDto>([...CRM_KEY, 'customers'], '/crm/customers', { search })
}

export function useCustomer(id: string) {
  return useApiGet<CustomerDto>([...CRM_KEY, 'customers', 'detail', id], `/crm/customers/${id}`)
}

export function useActivities(link: { leadId?: string; customerId?: string }, enabled: boolean) {
  return usePagedList<ActivityDto>([...CRM_KEY, 'activities'], '/crm/activities', link, { enabled })
}

export interface CreateActivityInput {
  type: ActivityType
  subject: string
  description: string | null
  leadId?: string
  customerId?: string
}

export function useCreateActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const response = await apiClient.post<ApiEnvelope<ActivityDto>>('/crm/activities', {
        type: input.type,
        subject: input.subject,
        description: input.description,
        dueDate: null,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        assignedToUserId: null,
      })
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...CRM_KEY, 'activities'] }),
  })
}

export function useCompleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<ActivityDto>>(`/crm/activities/${id}/complete`)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...CRM_KEY, 'activities'] }),
  })
}
