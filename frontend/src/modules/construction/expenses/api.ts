import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, ExpenseCategory, ExpenseDto, ExpensePaymentDto, ExpenseStatus, PageMeta } from '@/types/api'

const EXPENSES_KEY = ['construction', 'expenses']

export interface ExpenseFilters {
  projectId?: string
  workPackageId?: string
  status?: ExpenseStatus
  category?: ExpenseCategory
}

export function useExpenses(page: number, filters: ExpenseFilters) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExpenseDto[]>>('/construction/expenses', {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExpenseDto>>(`/construction/expenses/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface ExpenseRequest {
  projectId: string
  workPackageId: string | null
  category: ExpenseCategory
  amount: number
  expenseDate: string
  vendorId: string | null
  referenceNumber: string | null
  notes: string | null
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: EXPENSES_KEY })
  queryClient.invalidateQueries({ queryKey: ['construction', 'dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['construction', 'work-packages'] })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ExpenseRequest) => {
      const response = await apiClient.post<ApiEnvelope<ExpenseDto>>('/construction/expenses', payload)
      return response.data.data
    },
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useApproveExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<ExpenseDto>>(`/construction/expenses/${id}/approve`)
      return response.data.data
    },
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useRejectExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<ExpenseDto>>(`/construction/expenses/${id}/reject`)
      return response.data.data
    },
    onSuccess: () => invalidateExpenses(queryClient),
  })
}

export function useExpensePayments(id: string | undefined) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, id, 'payments'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExpensePaymentDto[]>>(`/construction/expenses/${id}/payments`)
      return response.data.data
    },
    enabled: !!id,
  })
}

export interface PayExpenseRequest {
  id: string
  amount: number
  paymentDate: string
  referenceNumber: string | null
  notes: string | null
  idempotencyKey: string | null
}

export function usePayExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: PayExpenseRequest) => {
      const response = await apiClient.post<ApiEnvelope<ExpensePaymentDto>>(`/construction/expenses/${id}/payments`, payload)
      return response.data.data
    },
    onSuccess: (_data, variables) => {
      invalidateExpenses(queryClient)
      queryClient.invalidateQueries({ queryKey: [...EXPENSES_KEY, variables.id, 'payments'] })
    },
  })
}
