import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, FiscalPeriodDto } from '@/types/api'

const FISCAL_PERIODS_KEY = ['finance', 'fiscal-periods']

export function useFiscalPeriods() {
  return useQuery({
    queryKey: FISCAL_PERIODS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FiscalPeriodDto[]>>('/finance/fiscal-periods')
      return response.data.data
    },
  })
}

export interface CreateFiscalPeriodRequest {
  name: string
  startDate: string
  endDate: string
}

function invalidateFiscalPeriods(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FISCAL_PERIODS_KEY })
}

export function useCreateFiscalPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateFiscalPeriodRequest) => {
      const response = await apiClient.post<ApiEnvelope<FiscalPeriodDto>>('/finance/fiscal-periods', payload)
      return response.data.data
    },
    onSuccess: () => invalidateFiscalPeriods(queryClient),
  })
}

function useFiscalPeriodAction(action: 'close' | 'reopen') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiEnvelope<FiscalPeriodDto>>(`/finance/fiscal-periods/${id}/${action}`)
      return response.data.data
    },
    onSuccess: () => invalidateFiscalPeriods(queryClient),
  })
}

export const useCloseFiscalPeriod = () => useFiscalPeriodAction('close')
export const useReopenFiscalPeriod = () => useFiscalPeriodAction('reopen')
