import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, BalanceSheetDto, CashFlowDto, ProfitAndLossDto, TrialBalanceDto } from '@/types/api'

export function useTrialBalance() {
  return useQuery({
    queryKey: ['finance', 'reports', 'trial-balance'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TrialBalanceDto>>('/finance/reports/trial-balance')
      return response.data.data
    },
  })
}

export function useBalanceSheet(asOf: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'reports', 'balance-sheet', asOf],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BalanceSheetDto>>('/finance/reports/balance-sheet', {
        params: { asOf: asOf || undefined },
      })
      return response.data.data
    },
  })
}

export function useProfitAndLoss(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'reports', 'profit-and-loss', from, to],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProfitAndLossDto>>('/finance/reports/profit-and-loss', {
        params: { from: from || undefined, to: to || undefined },
      })
      return response.data.data
    },
  })
}

export function useCashFlow(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'reports', 'cash-flow', from, to],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CashFlowDto>>('/finance/reports/cash-flow', {
        params: { from: from || undefined, to: to || undefined },
      })
      return response.data.data
    },
  })
}
