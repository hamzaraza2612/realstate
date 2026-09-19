import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, PageMeta, VendorDto } from '@/types/api'

const VENDORS_KEY = ['procurement', 'vendors']

export interface VendorFilters {
  isActive?: boolean
  search?: string
}

export function useVendors(page: number, filters: VendorFilters) {
  return useQuery({
    queryKey: [...VENDORS_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<VendorDto[]>>('/procurement/vendors', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllVendors() {
  return useQuery({
    queryKey: [...VENDORS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<VendorDto[]>>('/procurement/vendors', {
        params: { page: 1, pageSize: 200, isActive: true },
      })
      return response.data.data
    },
  })
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: [...VENDORS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<VendorDto>>(`/procurement/vendors/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface VendorRequest {
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  taxRegistrationNumber: string | null
  notes: string | null
}

export interface UpdateVendorRequest extends VendorRequest {
  isActive: boolean
}

function invalidateVendors(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: VENDORS_KEY })
  queryClient.invalidateQueries({ queryKey: ['procurement', 'dashboard'] })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VendorRequest) => {
      const response = await apiClient.post<ApiEnvelope<VendorDto>>('/procurement/vendors', payload)
      return response.data.data
    },
    onSuccess: () => invalidateVendors(queryClient),
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateVendorRequest }) => {
      const response = await apiClient.put<ApiEnvelope<VendorDto>>(`/procurement/vendors/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateVendors(queryClient),
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/procurement/vendors/${id}`)
    },
    onSuccess: () => invalidateVendors(queryClient),
  })
}
