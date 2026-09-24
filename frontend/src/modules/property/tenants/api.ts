import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, RentalTenantDto } from '@/types/api'

const TENANTS_KEY = ['property', 'tenants']

export interface TenantFilters {
  isActive?: boolean
  search?: string
}

export function useTenants(page: number, filters: TenantFilters) {
  return useQuery({
    queryKey: [...TENANTS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentalTenantDto[]>>('/property/tenants', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllTenants() {
  return useQuery({
    queryKey: [...TENANTS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentalTenantDto[]>>('/property/tenants', {
        params: { page: 1, pageSize: 200, isActive: true },
      })
      return response.data.data
    },
  })
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: [...TENANTS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentalTenantDto>>(`/property/tenants/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface TenantRequest {
  customerId: string | null
  fullName: string | null
  email: string | null
  phone: string | null
  address: string | null
  isCompany: boolean
  identificationNumber: string | null
  notes: string | null
}

export interface UpdateTenantRequest {
  email: string | null
  phone: string | null
  address: string | null
  isCompany: boolean
  identificationNumber: string | null
  isActive: boolean
  notes: string | null
}

function invalidateTenants(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: TENANTS_KEY })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TenantRequest) => {
      const response = await apiClient.post<ApiEnvelope<RentalTenantDto>>('/property/tenants', payload)
      return response.data.data
    },
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTenantRequest }) => {
      const response = await apiClient.put<ApiEnvelope<RentalTenantDto>>(`/property/tenants/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/property/tenants/${id}`)
    },
    onSuccess: () => invalidateTenants(queryClient),
  })
}
