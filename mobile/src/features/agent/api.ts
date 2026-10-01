import { useApiGet, usePagedList } from '@/api/paging'
import type { ActivityDto, BookingDto, CustomerDto, InventoryUnitDto, LeadDto, SalesByPeriodRow } from '@/types/modules'

/**
 * The Agent view — `AgentPortalController` (`/agent-portal/*`), consumed through the INTERNAL
 * `apiClient` (via `api/paging.ts`) with the agent's own staff session. Despite the "portal" in the
 * route name it is not part of the external-portal identity system: it is `[Authorize]` (internal
 * AppUser auth) and every action is self-scoped server-side to the caller's own UserId — see the
 * controller's and `IAgentPortalService`'s doc comments. This folder never imports `portalApiClient`.
 *
 *   GET /agent-portal/leads                (paged)  — leads assigned to me
 *   GET /agent-portal/customers            (list)   — customers I have bookings with
 *   GET /agent-portal/available-inventory  (paged)  — units with status Available
 *   GET /agent-portal/bookings             (paged)  — bookings where I'm the sales agent
 *   GET /agent-portal/follow-ups           (paged)  — CRM activities assigned to me
 *   GET /agent-portal/performance?from=&to=         — my bookings / net sales by month
 */

const AGENT_KEY = ['agent-portal'] as const

export function useAgentLeads(options: { pageSize?: number } = {}) {
  return usePagedList<LeadDto>([...AGENT_KEY, 'leads'], '/agent-portal/leads', {}, options)
}
export function useAgentCustomers() {
  return useApiGet<CustomerDto[]>([...AGENT_KEY, 'customers'], '/agent-portal/customers')
}
export function useAgentInventory(options: { pageSize?: number } = {}) {
  return usePagedList<InventoryUnitDto>([...AGENT_KEY, 'available-inventory'], '/agent-portal/available-inventory', {}, options)
}
export function useAgentBookings(options: { pageSize?: number } = {}) {
  return usePagedList<BookingDto>([...AGENT_KEY, 'bookings'], '/agent-portal/bookings', {}, options)
}
export function useAgentFollowUps(options: { pageSize?: number } = {}) {
  return usePagedList<ActivityDto>([...AGENT_KEY, 'follow-ups'], '/agent-portal/follow-ups', {}, options)
}
/** `from`/`to` omitted → the backend's default report range (1st of this month → today). */
export function useAgentPerformance(range: { from?: string; to?: string }) {
  return useApiGet<SalesByPeriodRow[]>([...AGENT_KEY, 'performance'], '/agent-portal/performance', { params: range })
}
