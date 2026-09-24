import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type { ActivityDto, ApiEnvelope, BookingDto, CustomerDto, InventoryUnitDto, LeadDto, PageMeta, SalesByPeriodRow } from '@/types/api'

// The Agent Portal deliberately reuses the INTERNAL apiClient/useAuthStore, not the new portal
// auth store/client — an agent is already an internal staff AppUser with a role, and there is no
// separate portal login for agents. See docs/PORTAL_ARCHITECTURE.md, "Why the Agent Portal is
// different".
const KEY = ['agent-portal'] as const

export function useAgentLeads(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'leads', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeadDto[]>>('/agent-portal/leads', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAgentCustomers() {
  return useQuery({
    queryKey: [...KEY, 'customers'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CustomerDto[]>>('/agent-portal/customers')
      return response.data.data
    },
  })
}

export function useAgentAvailableInventory(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'available-inventory', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<InventoryUnitDto[]>>('/agent-portal/available-inventory', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAgentBookings(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'bookings', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingDto[]>>('/agent-portal/bookings', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useAgentFollowUps(page: number, pageSize = 20) {
  return useQuery({
    queryKey: [...KEY, 'follow-ups', page, pageSize],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ActivityDto[]>>('/agent-portal/follow-ups', { params: { page, pageSize } })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface AgentPerformanceFilters {
  from?: string
  to?: string
}

export function useAgentPerformance(filters: AgentPerformanceFilters) {
  return useQuery({
    queryKey: [...KEY, 'performance', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesByPeriodRow[]>>('/agent-portal/performance', { params: filters })
      return response.data.data
    },
  })
}
