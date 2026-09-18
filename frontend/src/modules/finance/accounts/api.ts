import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { AccountDto, AccountType, ApiEnvelope, PageMeta } from '@/types/api'

const ACCOUNTS_KEY = ['finance', 'accounts']

export interface AccountFilters {
  type?: AccountType
  isActive?: boolean
  search?: string
}

export function useAccounts(page: number, filters: AccountFilters, pageSize = 20) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, page, filters, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AccountDto[]>>('/finance/accounts', {
        params: { page, pageSize, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAllAccounts() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'all'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AccountDto[]>>('/finance/accounts', { params: { page: 1, pageSize: 200 } })
      return response.data.data
    },
  })
}

export interface CreateAccountRequest {
  code: string
  name: string
  type: AccountType
  parentAccountId: string | null
}

export interface UpdateAccountRequest {
  name: string
  parentAccountId: string | null
  isActive: boolean
}

function invalidateAccounts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAccountRequest) => {
      const response = await apiClient.post<ApiEnvelope<AccountDto>>('/finance/accounts', payload)
      return response.data.data
    },
    onSuccess: () => invalidateAccounts(queryClient),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateAccountRequest }) => {
      const response = await apiClient.put<ApiEnvelope<AccountDto>>(`/finance/accounts/${id}`, payload)
      return response.data.data
    },
    onSuccess: () => invalidateAccounts(queryClient),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/finance/accounts/${id}`)
    },
    onSuccess: () => invalidateAccounts(queryClient),
  })
}
