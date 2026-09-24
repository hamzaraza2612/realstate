import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  BookingCancellationRow,
  BookingStatus,
  BookingStatusReportRow,
  PageMeta,
  ReceivableAgingRow,
  ReceivableDto,
  SalesByAgentRow,
  SalesByPeriodRow,
  SalesByProjectRow,
  SalesCollectionRow,
  SalesConversionReportDto,
} from '@/types/api'
import type { InstallmentStatus } from '@/types/api'

export interface SalesReportFilters {
  from?: string
  to?: string
  projectId?: string
  agentUserId?: string
  customerId?: string
  status?: BookingStatus
}

const BASE = '/reports/sales'

export function useSalesByProject(filters: SalesReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-project', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesByProjectRow[]>>(`${BASE}/by-project`, { params: filters })
      return response.data.data
    },
  })
}

export function useSalesByPeriod(filters: SalesReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-period', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesByPeriodRow[]>>(`${BASE}/by-period`, { params: filters })
      return response.data.data
    },
  })
}

export function useSalesByAgent(filters: SalesReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'by-agent', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesByAgentRow[]>>(`${BASE}/by-agent`, { params: filters })
      return response.data.data
    },
  })
}

export function useBookingStatusReport(filters: Omit<SalesReportFilters, 'status'>) {
  return useQuery({
    queryKey: ['reports', 'sales', 'booking-status', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingStatusReportRow[]>>(`${BASE}/booking-status`, { params: filters })
      return response.data.data
    },
  })
}

export function useSalesConversion(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'sales', 'conversion', from, to],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesConversionReportDto>>(`${BASE}/conversion`, {
        params: { from, to },
      })
      return response.data.data
    },
  })
}

export function useSalesCancellations(page: number, filters: SalesReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'cancellations', page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingCancellationRow[]>>(`${BASE}/cancellations`, {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export interface SalesCollectionFilters {
  from?: string
  to?: string
  projectId?: string
  customerId?: string
}

export function useSalesCollections(filters: SalesCollectionFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'collections', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesCollectionRow[]>>(`${BASE}/collections`, { params: filters })
      return response.data.data
    },
  })
}

export interface OutstandingInstallmentFilters {
  customerId?: string
  status?: InstallmentStatus
  overdueOnly?: boolean
  search?: string
}

export function useOutstandingInstallments(page: number, filters: OutstandingInstallmentFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', 'outstanding-installments', page, filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ReceivableDto[]>>(`${BASE}/outstanding-installments`, {
        params: { page, pageSize: 20, ...filters },
      })
      return { items: response.data.data, meta: response.data.meta as PageMeta }
    },
    placeholderData: (prev) => prev,
  })
}

export function useReceivableAging() {
  return useQuery({
    queryKey: ['reports', 'sales', 'receivable-aging'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ReceivableAgingRow[]>>(`${BASE}/receivable-aging`)
      return response.data.data
    },
  })
}
