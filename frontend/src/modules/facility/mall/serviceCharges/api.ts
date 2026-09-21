import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  LeasePaymentFrequency,
  PageMeta,
  ServiceChargeCalculationType,
  ServiceChargeChargeDto,
  ServiceChargeDefinitionDto,
  ServiceChargeStatus,
} from '@/types/api'

const DEFINITIONS_KEY = ['facility', 'mall', 'service-charge-definitions']
const CHARGES_KEY = ['facility', 'mall', 'service-charges']

export interface ServiceChargeDefinitionFilters {
  facilityId?: string
  isActive?: boolean
}

export function useServiceChargeDefinitions(filters: ServiceChargeDefinitionFilters) {
  return useQuery({
    queryKey: [...DEFINITIONS_KEY, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ServiceChargeDefinitionDto[]>>('/facility/mall/service-charges/definitions', {
        params: { page: 1, pageSize: 200, ...filters },
      })
      return response.data.data
    },
  })
}

export interface ServiceChargeDefinitionRequest {
  facilityId: string
  name: string
  calculationType: ServiceChargeCalculationType
  amount: number
  billingFrequency: LeasePaymentFrequency
}

export interface UpdateServiceChargeDefinitionRequest {
  name: string
  amount: number
  billingFrequency: LeasePaymentFrequency
  isActive: boolean
}

function invalidateDefinitions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: DEFINITIONS_KEY })
}

export function useCreateServiceChargeDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ServiceChargeDefinitionRequest) => {
      const response = await apiClient.post<ApiEnvelope<ServiceChargeDefinitionDto>>('/facility/mall/service-charges/definitions', payload)
      return response.data.data
    },
    onSuccess: () => invalidateDefinitions(queryClient),
  })
}

export function useUpdateServiceChargeDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateServiceChargeDefinitionRequest }) => {
      const response = await apiClient.put<ApiEnvelope<ServiceChargeDefinitionDto>>(`/facility/mall/service-charges/definitions/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateDefinitions(queryClient),
  })
}

export interface ServiceChargeFilters {
  leaseId?: string
  serviceChargeDefinitionId?: string
  status?: ServiceChargeStatus
}

export function useServiceCharges(page: number, filters: ServiceChargeFilters) {
  return useQuery({
    queryKey: [...CHARGES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ServiceChargeChargeDto[]>>('/facility/mall/service-charges/charges', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface GenerateServiceChargeRequest {
  serviceChargeDefinitionId: string
  leaseId: string
  periodStart: string
  periodEnd: string
  dueDate: string
}

export function useGenerateServiceCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: GenerateServiceChargeRequest) => {
      const response = await apiClient.post<ApiEnvelope<ServiceChargeChargeDto>>('/facility/mall/service-charges/charges/generate', payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHARGES_KEY })
      queryClient.invalidateQueries({ queryKey: ['facility', 'mall-dashboard'] })
    },
  })
}
