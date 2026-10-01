import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { tenantToday } from '@/utils/format'
import type { ApiEnvelope, ExecutiveDashboardDto } from '@/types/api'

/**
 * The Management Home's KPI tiles. `CommandCenterSummaryDto` carries no money figures, so — as
 * docs/MOBILE_ARCHITECTURE.md allows — the tiles read the existing Milestone 12
 * `GET /reports/executive` (the same endpoint the web Dashboard's snapshot uses), never a mobile-
 * side computation. Called with `from = to = today` (tenant timezone), which yields exactly:
 *   - `sales`        → confirmed booking value dated today ("Today's bookings"),
 *   - `cashPosition` → cash as of today (the backend's cash flow is cumulative up to `to`),
 *   - `receivables`  → outstanding installments (point-in-time; not range-bound).
 * Gated by `reports.view` + the Advanced Reporting entitlement server-side; the caller hides the
 * tiles without the permission and explains a 403.
 */
export function useHomeKeyFigures(enabled: boolean) {
  const today = tenantToday()
  return useQuery({
    queryKey: ['reports', 'executive', 'home-today', today],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ExecutiveDashboardDto>>('/reports/executive', {
        params: { from: today, to: today },
      })
      return response.data.data
    },
    enabled,
  })
}
