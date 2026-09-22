import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, BudgetVsActualRow, ConstructionExpenseByCategoryRow, WorkPackageProgressRow, WorkPackageStatus } from '@/types/api'

const BASE = '/reports/construction'

export interface WorkPackageProgressFilters {
  projectId?: string
  status?: WorkPackageStatus
}

export function useWorkPackageProgress(filters: WorkPackageProgressFilters) {
  return useQuery({
    queryKey: ['reports', 'construction', 'work-package-progress', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<WorkPackageProgressRow[]>>(`${BASE}/work-package-progress`, { params: filters })
      return response.data.data
    },
  })
}

export interface ConstructionExpenseFilters {
  from?: string
  to?: string
  projectId?: string
}

export function useConstructionExpensesByCategory(filters: ConstructionExpenseFilters) {
  return useQuery({
    queryKey: ['reports', 'construction', 'expenses', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ConstructionExpenseByCategoryRow[]>>(`${BASE}/expenses`, { params: filters })
      return response.data.data
    },
  })
}

export function useBudgetVsActual(projectId?: string) {
  return useQuery({
    queryKey: ['reports', 'construction', 'budget-vs-actual', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BudgetVsActualRow[]>>(`${BASE}/budget-vs-actual`, { params: { projectId } })
      return response.data.data
    },
  })
}
