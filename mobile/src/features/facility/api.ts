import { useApiGet, usePagedList } from '@/api/paging'
import type {
  CoworkingBookingDto,
  CoworkingBookingStatus,
  FacilityDto,
  FacilityOperatingStatus,
  MaintenanceStatus,
  MallShopDto,
  ServiceRequestDto,
  SpaceDto,
  SpaceStatus,
} from '@/types/modules'

/**
 * Facility / Mall / Coworking — the web `modules/facility` endpoints (all `facility.view`):
 *   GET /facilities?search=&status=, GET /facilities/{id}
 *   GET /facility/spaces?search=&status=&facilityId=, GET /facility/spaces/{id}
 *   GET /facility/service-requests?search=&status=&facilityId=, GET /facility/service-requests/{id}
 *   GET /facility/mall/shops?search=&status=, GET /facility/mall/shops/{spaceId}
 *   GET /facility/coworking/bookings?status=, GET /facility/coworking/bookings/{id}   (no search param)
 */

export const FACILITY_KEY = ['facility']

export function useFacilities(params: { search?: string; status?: FacilityOperatingStatus }) {
  return usePagedList<FacilityDto>([...FACILITY_KEY, 'facilities'], '/facilities', params)
}
export function useFacilityRecord(id: string) {
  return useApiGet<FacilityDto>([...FACILITY_KEY, 'facilities', 'detail', id], `/facilities/${id}`)
}

export function useSpaces(params: { search?: string; status?: SpaceStatus; facilityId?: string }) {
  return usePagedList<SpaceDto>([...FACILITY_KEY, 'spaces'], '/facility/spaces', params)
}
export function useSpace(id: string) {
  return useApiGet<SpaceDto>([...FACILITY_KEY, 'spaces', 'detail', id], `/facility/spaces/${id}`)
}

export function useServiceRequests(params: { search?: string; status?: MaintenanceStatus; facilityId?: string; spaceId?: string }) {
  return usePagedList<ServiceRequestDto>([...FACILITY_KEY, 'service-requests'], '/facility/service-requests', params)
}
export function useServiceRequest(id: string) {
  return useApiGet<ServiceRequestDto>([...FACILITY_KEY, 'service-requests', 'detail', id], `/facility/service-requests/${id}`)
}

export function useMallShops(params: { search?: string; status?: SpaceStatus }) {
  return usePagedList<MallShopDto>([...FACILITY_KEY, 'mall-shops'], '/facility/mall/shops', params)
}
export function useMallShop(spaceId: string) {
  return useApiGet<MallShopDto>([...FACILITY_KEY, 'mall-shops', 'detail', spaceId], `/facility/mall/shops/${spaceId}`)
}

export function useCoworkingBookings(params: { status?: CoworkingBookingStatus }) {
  return usePagedList<CoworkingBookingDto>([...FACILITY_KEY, 'coworking-bookings'], '/facility/coworking/bookings', params)
}
export function useCoworkingBooking(id: string) {
  return useApiGet<CoworkingBookingDto>([...FACILITY_KEY, 'coworking-bookings', 'detail', id], `/facility/coworking/bookings/${id}`)
}
