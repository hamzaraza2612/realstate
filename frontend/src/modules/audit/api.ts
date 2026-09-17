import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, AuditLogDto, PageMeta } from '@/types/api'

export interface AuditLogFilters {
  module?: string
  action?: string
  entityType?: string
}

export function useAuditLogs(page: number, filters: AuditLogFilters, basePath = '/audit-logs') {
  return useQuery({
    queryKey: ['audit-logs', basePath, page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<AuditLogDto[]>>(basePath, {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}
