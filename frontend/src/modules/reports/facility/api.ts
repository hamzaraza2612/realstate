import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/apiClient'
import type {
  ApiEnvelope,
  BookingTrendRow,
  CoworkingDeskUtilizationRow,
  FacilityEventsRow,
  FacilityRevenueRow,
  FacilityUtilizationRow,
  MaintenanceBacklogRow,
  MallOccupancyRow,
  MeetingRoomUtilizationRow,
  ParkingReportRow,
  ServiceChargeCollectionRow,
} from '@/types/api'

const BASE = '/reports/facility'

export interface FacilityDateFilters {
  from?: string
  to?: string
}

export function useFacilityUtilization() {
  return useQuery({
    queryKey: ['reports', 'facility', 'utilization'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityUtilizationRow[]>>(`${BASE}/utilization`)
      return response.data.data
    },
  })
}

export function useMallOccupancy() {
  return useQuery({
    queryKey: ['reports', 'facility', 'mall-occupancy'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MallOccupancyRow[]>>(`${BASE}/mall-occupancy`)
      return response.data.data
    },
  })
}

export function useServiceChargeCollection(filters: FacilityDateFilters) {
  return useQuery({
    queryKey: ['reports', 'facility', 'service-charge-collection', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ServiceChargeCollectionRow[]>>(`${BASE}/service-charge-collection`, {
        params: filters,
      })
      return response.data.data
    },
  })
}

export function useFacilityRevenue(filters: FacilityDateFilters) {
  return useQuery({
    queryKey: ['reports', 'facility', 'revenue', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityRevenueRow[]>>(`${BASE}/revenue`, { params: filters })
      return response.data.data
    },
  })
}

export function useParkingReport() {
  return useQuery({
    queryKey: ['reports', 'facility', 'parking'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<ParkingReportRow[]>>(`${BASE}/parking`)
      return response.data.data
    },
  })
}

export function useFacilityEvents() {
  return useQuery({
    queryKey: ['reports', 'facility', 'events'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<FacilityEventsRow[]>>(`${BASE}/events`)
      return response.data.data
    },
  })
}

export function useCoworkingDeskUtilization() {
  return useQuery({
    queryKey: ['reports', 'facility', 'coworking-desk-utilization'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<CoworkingDeskUtilizationRow[]>>(`${BASE}/coworking-desk-utilization`)
      return response.data.data
    },
  })
}

export function useMeetingRoomUtilization(filters: FacilityDateFilters) {
  return useQuery({
    queryKey: ['reports', 'facility', 'meeting-room-utilization', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MeetingRoomUtilizationRow[]>>(`${BASE}/meeting-room-utilization`, {
        params: filters,
      })
      return response.data.data
    },
  })
}

export function useBookingTrends(filters: FacilityDateFilters) {
  return useQuery({
    queryKey: ['reports', 'facility', 'booking-trends', filters],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<BookingTrendRow[]>>(`${BASE}/booking-trends`, { params: filters })
      return response.data.data
    },
  })
}

export function useMaintenanceBacklog() {
  return useQuery({
    queryKey: ['reports', 'facility', 'maintenance-backlog'],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<MaintenanceBacklogRow[]>>(`${BASE}/maintenance-backlog`)
      return response.data.data
    },
  })
}
