import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/apiClient'
import { useApiGet, usePagedList } from '@/api/paging'
import type { ApiEnvelope } from '@/types/api'
import type {
  LeaseDto,
  LeaseStatus,
  MaintenanceRequestDto,
  MaintenanceStatus,
  PropertyDto,
  PropertyStatus,
  PropertyUnitDto,
  PropertyUnitStatus,
  RentalTenantDto,
  RentPaymentDto,
  RentScheduleDto,
  SecurityDepositDto,
} from '@/types/modules'

/**
 * Property & Rental — the web `modules/property` endpoints (reads need `property.view`):
 *   GET /property/properties?search=&status=, GET /property/properties/{id}
 *   GET /property/units?search=&status=&propertyId=, GET /property/units/{id}
 *   GET /property/tenants?search=, GET /property/tenants/{id}
 *   GET /property/leases?search=&status=&unitId=&rentalTenantId=&propertyId=, GET /property/leases/{id}
 *   GET /property/leases/{id}/rent-schedule | /payments | /security-deposit   (per-lease, unpaged server-side)
 *   GET /property/maintenance-requests?search=&status=&propertyId=&unitId=, GET /property/maintenance-requests/{id}
 *   POST /property/maintenance-requests/{id}/status   (property.maintenance.manage — transition rules are
 *        enforced server-side by MaintenanceStatusRules; the app shows the server's rejection)
 */

export const PROPERTY_KEY = ['property']

export function useProperties(params: { search?: string; status?: PropertyStatus }) {
  return usePagedList<PropertyDto>([...PROPERTY_KEY, 'properties'], '/property/properties', params)
}
export function usePropertyRecord(id: string) {
  return useApiGet<PropertyDto>([...PROPERTY_KEY, 'properties', 'detail', id], `/property/properties/${id}`)
}

export function useUnits(params: { search?: string; status?: PropertyUnitStatus; propertyId?: string }, enabled = true) {
  return usePagedList<PropertyUnitDto>([...PROPERTY_KEY, 'units'], '/property/units', params, { enabled })
}
export function useUnit(id: string) {
  return useApiGet<PropertyUnitDto>([...PROPERTY_KEY, 'units', 'detail', id], `/property/units/${id}`)
}

export function useRentalTenants(params: { search?: string }) {
  return usePagedList<RentalTenantDto>([...PROPERTY_KEY, 'tenants'], '/property/tenants', params)
}
export function useRentalTenant(id: string) {
  return useApiGet<RentalTenantDto>([...PROPERTY_KEY, 'tenants', 'detail', id], `/property/tenants/${id}`)
}

export function useLeases(params: { search?: string; status?: LeaseStatus; unitId?: string; rentalTenantId?: string; propertyId?: string }, enabled = true) {
  return usePagedList<LeaseDto>([...PROPERTY_KEY, 'leases'], '/property/leases', params, { enabled })
}
export function useLease(id: string) {
  return useApiGet<LeaseDto>([...PROPERTY_KEY, 'leases', 'detail', id], `/property/leases/${id}`)
}
export function useRentSchedule(leaseId: string) {
  return useApiGet<RentScheduleDto[]>([...PROPERTY_KEY, 'leases', 'rent-schedule', leaseId], `/property/leases/${leaseId}/rent-schedule`)
}
export function useRentPayments(leaseId: string) {
  return useApiGet<RentPaymentDto[]>([...PROPERTY_KEY, 'leases', 'payments', leaseId], `/property/leases/${leaseId}/payments`)
}
export function useSecurityDeposit(leaseId: string) {
  return useApiGet<SecurityDepositDto>([...PROPERTY_KEY, 'leases', 'security-deposit', leaseId], `/property/leases/${leaseId}/security-deposit`)
}

export function useMaintenanceRequests(params: { search?: string; status?: MaintenanceStatus; propertyId?: string; unitId?: string }, enabled = true) {
  return usePagedList<MaintenanceRequestDto>([...PROPERTY_KEY, 'maintenance'], '/property/maintenance-requests', params, { enabled })
}
export function useMaintenanceRequest(id: string) {
  return useApiGet<MaintenanceRequestDto>([...PROPERTY_KEY, 'maintenance', 'detail', id], `/property/maintenance-requests/${id}`)
}

export function useChangeMaintenanceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, resolutionNotes }: { id: string; status: MaintenanceStatus; resolutionNotes: string | null }) => {
      const response = await apiClient.post<ApiEnvelope<MaintenanceRequestDto>>(`/property/maintenance-requests/${id}/status`, {
        status,
        resolutionNotes,
        completionDate: null,
      })
      return response.data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...PROPERTY_KEY, 'maintenance', 'detail', updated.id], updated)
      queryClient.invalidateQueries({ queryKey: [...PROPERTY_KEY, 'maintenance'] })
    },
  })
}
