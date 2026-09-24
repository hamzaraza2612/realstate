import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  InventoryAvailabilityRow,
  ProjectCollectionSummaryRow,
  ProjectFinancialSummaryRow,
  ProjectProgressRow,
  ProjectSalesSummaryRow,
  SoldVsAvailableRow,
} from '@/types/api'

const BASE = '/reports/projects'

export interface ProjectReportFilters {
  from?: string
  to?: string
  projectId?: string
}

export function useInventoryAvailability(projectId?: string) {
  return useQuery({
    queryKey: ['reports', 'projects', 'inventory-availability', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InventoryAvailabilityRow[]>>(`${BASE}/inventory-availability`, {
        params: { projectId },
      })
      return response.data.data
    },
  })
}

export function useSoldVsAvailable(projectId?: string) {
  return useQuery({
    queryKey: ['reports', 'projects', 'sold-vs-available', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SoldVsAvailableRow[]>>(`${BASE}/sold-vs-available`, { params: { projectId } })
      return response.data.data
    },
  })
}

export function useProjectSalesSummary(filters: ProjectReportFilters) {
  return useQuery({
    queryKey: ['reports', 'projects', 'sales-summary', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectSalesSummaryRow[]>>(`${BASE}/sales-summary`, { params: filters })
      return response.data.data
    },
  })
}

export function useProjectCollectionSummary(projectId?: string) {
  return useQuery({
    queryKey: ['reports', 'projects', 'collection-summary', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectCollectionSummaryRow[]>>(`${BASE}/collection-summary`, {
        params: { projectId },
      })
      return response.data.data
    },
  })
}

export function useProjectFinancialSummary(filters: ProjectReportFilters) {
  return useQuery({
    queryKey: ['reports', 'projects', 'financial-summary', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectFinancialSummaryRow[]>>(`${BASE}/financial-summary`, { params: filters })
      return response.data.data
    },
  })
}

export function useProjectProgress(projectId?: string) {
  return useQuery({
    queryKey: ['reports', 'projects', 'progress', projectId],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ProjectProgressRow[]>>(`${BASE}/progress`, { params: { projectId } })
      return response.data.data
    },
  })
}
