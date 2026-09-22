import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApAgingReportDto, ApiEnvelope, ArAgingReportDto, MonthlyAmountRow } from '@/types/api'

const BASE = '/reports/finance'

export function useArAging() {
  return useQuery({
    queryKey: ['reports', 'finance', 'ar-aging'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ArAgingReportDto>>(`${BASE}/ar-aging`)
      return response.data.data
    },
  })
}

export function useApAging() {
  return useQuery({
    queryKey: ['reports', 'finance', 'ap-aging'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ApAgingReportDto>>(`${BASE}/ap-aging`)
      return response.data.data
    },
  })
}

export interface TrendFilters {
  from?: string
  to?: string
}

export function useRevenueTrend(filters: TrendFilters) {
  return useQuery({
    queryKey: ['reports', 'finance', 'revenue-trend', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MonthlyAmountRow[]>>(`${BASE}/revenue-trend`, { params: filters })
      return response.data.data
    },
  })
}

export function useExpenseTrend(filters: TrendFilters) {
  return useQuery({
    queryKey: ['reports', 'finance', 'expense-trend', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MonthlyAmountRow[]>>(`${BASE}/expense-trend`, { params: filters })
      return response.data.data
    },
  })
}

export function useCollectionsTrend(filters: TrendFilters) {
  return useQuery({
    queryKey: ['reports', 'finance', 'collections-trend', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MonthlyAmountRow[]>>(`${BASE}/collections-trend`, { params: filters })
      return response.data.data
    },
  })
}
