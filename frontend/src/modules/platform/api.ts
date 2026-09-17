import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, OrganizationDto, PageMeta, SubscriptionPlanDto, TenantStatus } from '@/types/api'

const PLATFORM_ORGS_KEY = ['platform', 'organizations']
const PLATFORM_PLANS_KEY = ['platform', 'subscription-plans']

export function usePlatformOrganizations(page: number, search: string) {
  return useQuery({
    queryKey: [...PLATFORM_ORGS_KEY, page, search],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OrganizationDto[]>>('/platform/organizations', {
        params: { page, pageSize: 20, search: search || undefined },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface CreateOrganizationRequest {
  name: string
  slug: string
  contactEmail: string | null
  contactPhone: string | null
  timezone: string
  subscriptionPlanId: string | null
  ownerEmail: string
  ownerFullName: string
  ownerPassword: string
}

export function useCreatePlatformOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOrganizationRequest) => {
      const response = await apiClient.post<ApiEnvelope<OrganizationDto>>('/platform/organizations', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_ORGS_KEY }),
  })
}

export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenantStatus }) => {
      const response = await apiClient.post<ApiEnvelope<OrganizationDto>>(`/platform/organizations/${id}/status`, { status })
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_ORGS_KEY }),
  })
}

export function usePlatformSubscriptionPlans() {
  return useQuery({
    queryKey: PLATFORM_PLANS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SubscriptionPlanDto[]>>('/platform/subscription-plans')
      return response.data.data
    },
  })
}

export interface SubscriptionPlanRequest {
  name: string
  price: number
  billingCycle: number
  userLimit: number
  projectLimit: number
  storageLimitMb: number
  isActive?: boolean
  features: string[]
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SubscriptionPlanRequest) => {
      const response = await apiClient.post<ApiEnvelope<SubscriptionPlanDto>>('/platform/subscription-plans', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_PLANS_KEY }),
  })
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SubscriptionPlanRequest }) => {
      const response = await apiClient.put<ApiEnvelope<SubscriptionPlanDto>>(`/platform/subscription-plans/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLATFORM_PLANS_KEY }),
  })
}
