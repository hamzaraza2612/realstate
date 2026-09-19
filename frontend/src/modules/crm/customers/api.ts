import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, CustomerDto, PageMeta } from '@/types/api'

const CUSTOMERS_KEY = ['crm', 'customers']

export function useCustomers(page: number, search: string) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, page, search],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CustomerDto[]>>('/crm/customers', {
        params: { page, pageSize: 20, search: search || undefined },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CustomerDto>>(`/crm/customers/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface CustomerRequest {
  fullName: string
  email: string | null
  phone: string | null
  address: string | null
  companyName: string | null
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CustomerRequest) => {
      const response = await apiClient.post<ApiEnvelope<CustomerDto>>('/crm/customers', payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CustomerRequest }) => {
      const response = await apiClient.put<ApiEnvelope<CustomerDto>>(`/crm/customers/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
  })
}
