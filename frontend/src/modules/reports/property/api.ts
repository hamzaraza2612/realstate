import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  LeaseStatusReportRow,
  OverdueRentRow,
  PropertyOccupancyRow,
  PropertyRevenueRow,
  RentBilledRow,
  RentCollectedRow,
  TenantAgingRow,
} from '@/types/api'

const BASE = '/reports/property'

export interface PropertyDateFilters {
  from?: string
  to?: string
}

export function usePropertyOccupancy() {
  return useQuery({
    queryKey: ['reports', 'property', 'occupancy'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyOccupancyRow[]>>(`${BASE}/occupancy`)
      return response.data.data
    },
  })
}

export function useRentBilled(filters: PropertyDateFilters) {
  return useQuery({
    queryKey: ['reports', 'property', 'rent-billed', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentBilledRow[]>>(`${BASE}/rent-billed`, { params: filters })
      return response.data.data
    },
  })
}

export function useRentCollected(filters: PropertyDateFilters) {
  return useQuery({
    queryKey: ['reports', 'property', 'rent-collected', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<RentCollectedRow[]>>(`${BASE}/rent-collected`, { params: filters })
      return response.data.data
    },
  })
}

export function useOverdueRent() {
  return useQuery({
    queryKey: ['reports', 'property', 'overdue-rent'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<OverdueRentRow[]>>(`${BASE}/overdue-rent`)
      return response.data.data
    },
  })
}

export function usePropertyRevenue(filters: PropertyDateFilters) {
  return useQuery({
    queryKey: ['reports', 'property', 'revenue', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PropertyRevenueRow[]>>(`${BASE}/revenue`, { params: filters })
      return response.data.data
    },
  })
}

export function useTenantAging() {
  return useQuery({
    queryKey: ['reports', 'property', 'tenant-aging'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<TenantAgingRow[]>>(`${BASE}/tenant-aging`)
      return response.data.data
    },
  })
}

export function useLeaseStatusReport() {
  return useQuery({
    queryKey: ['reports', 'property', 'lease-status'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<LeaseStatusReportRow[]>>(`${BASE}/lease-status`)
      return response.data.data
    },
  })
}
