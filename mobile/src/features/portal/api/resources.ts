import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { portalApiClient } from '@/api/portalApiClient'
import type { ApiEnvelope } from '@/types/api'
import type {
  BookingDto,
  CoworkingBookingDto,
  LeaseDto,
  MaintenanceRequestDto,
  MembershipDto,
  PaymentDto,
  PaymentPlanDto,
  PurchaseOrderDto,
  RentPaymentDto,
  RentScheduleDto,
  SecurityDepositDto,
} from '@/types/modules'
import type {
  CreateTenantMaintenanceRequest,
  OverdueRentRow,
  OwnerPropertyDetailDto,
  OwnerPropertyDto,
  PortalBookingPaymentEntry,
  PortalLeasePaymentEntry,
  PropertyRevenueRow,
  RentCollectedRow,
} from '@/types/portal'
import { PORTAL_AREAS } from '../areas'
import { areaKey } from './common'
import { usePortalGet, usePortalPagedList } from './portalQueries'

/**
 * Each portal area's own resources — the existing `Portal*Controller` endpoints, unchanged, all via
 * `portalApiClient` (through `usePortalGet`/`usePortalPagedList`). Lists the backend pages
 * (`PagedRequest`) are fetched 20 at a time with "Load more"; endpoints the backend returns as a
 * plain bounded array (payments history, owner properties/report rows) are fetched as one resource.
 *
 * For a Home screen's at-a-glance figures a single page of up to 100 rows (the backend's `PagedRequest`
 * maximum) is read — the same thing the web portal dashboards do — and every figure is derived only
 * from rows the server returned.
 */

export const HOME_SAMPLE_SIZE = 100

// --- Customer (`/portal/customer`) ---

const customer = PORTAL_AREAS.Customer
const customerKey = areaKey(customer)

export function useCustomerBookings(options: { pageSize?: number } = {}) {
  return usePortalPagedList<BookingDto>([...customerKey, 'bookings'], `${customer.apiPrefix}/bookings`, {}, options)
}
export function useCustomerBooking(id: string) {
  return usePortalGet<BookingDto>([...customerKey, 'bookings', 'detail', id], `${customer.apiPrefix}/bookings/${id}`)
}
/** 404 when the booking has no payment plan yet — shown as "no plan", not an error. */
export function useCustomerPaymentPlan(bookingId: string, enabled = true) {
  return usePortalGet<PaymentPlanDto>([...customerKey, 'bookings', 'payment-plan', bookingId], `${customer.apiPrefix}/bookings/${bookingId}/payment-plan`, {
    enabled,
    retry: false,
  })
}
export function useCustomerBookingPayments(bookingId: string) {
  return usePortalGet<PaymentDto[]>([...customerKey, 'bookings', 'payments', bookingId], `${customer.apiPrefix}/bookings/${bookingId}/payments`)
}
/** The payment plans of several of the customer's bookings at once (Home's "next installment due"):
 * one `GET bookings/{id}/payment-plan` per booking, in parallel, sharing the detail screen's cache. */
export function useCustomerPaymentPlans(bookingIds: string[]) {
  return useQueries({
    queries: bookingIds.map((bookingId) => ({
      queryKey: [...customerKey, 'bookings', 'payment-plan', bookingId],
      queryFn: async () => {
        const response = await portalApiClient.get<ApiEnvelope<PaymentPlanDto>>(`${customer.apiPrefix}/bookings/${bookingId}/payment-plan`)
        return response.data.data
      },
      retry: false,
    })),
  })
}
export function useCustomerPayments() {
  return usePortalGet<PortalBookingPaymentEntry[]>([...customerKey, 'payments'], `${customer.apiPrefix}/payments`)
}

// --- Tenant (`/portal/tenant`) ---

const tenant = PORTAL_AREAS.RentalTenant
const tenantKey = areaKey(tenant)

export function useTenantLeases(options: { pageSize?: number } = {}) {
  return usePortalPagedList<LeaseDto>([...tenantKey, 'leases'], `${tenant.apiPrefix}/leases`, {}, options)
}
export function useTenantLease(id: string) {
  return usePortalGet<LeaseDto>([...tenantKey, 'leases', 'detail', id], `${tenant.apiPrefix}/leases/${id}`)
}
export function useTenantRentSchedule(leaseId: string | undefined) {
  return usePortalGet<RentScheduleDto[]>([...tenantKey, 'leases', 'rent-schedule', leaseId], `${tenant.apiPrefix}/leases/${leaseId}/rent-schedule`, {
    enabled: !!leaseId,
  })
}
export function useTenantLeasePayments(leaseId: string) {
  return usePortalGet<RentPaymentDto[]>([...tenantKey, 'leases', 'payments', leaseId], `${tenant.apiPrefix}/leases/${leaseId}/payments`)
}
/** 404 when no deposit is recorded for the lease — shown as "none", not an error. */
export function useTenantSecurityDeposit(leaseId: string) {
  return usePortalGet<SecurityDepositDto>([...tenantKey, 'leases', 'security-deposit', leaseId], `${tenant.apiPrefix}/leases/${leaseId}/security-deposit`, {
    retry: false,
  })
}
export function useTenantPayments() {
  return usePortalGet<PortalLeasePaymentEntry[]>([...tenantKey, 'payments'], `${tenant.apiPrefix}/payments`)
}
export function useTenantMaintenanceRequests(options: { pageSize?: number } = {}) {
  return usePortalPagedList<MaintenanceRequestDto>([...tenantKey, 'maintenance'], `${tenant.apiPrefix}/maintenance-requests`, {}, options)
}

/** The tenant portal's one write: a real `POST /portal/tenant/maintenance-requests`. The created
 * request (with its server-assigned number and status) is returned; validation failures come back
 * as the server's own message. Callers disable it while offline — never queued. */
export function useCreateTenantMaintenanceRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreateTenantMaintenanceRequest) => {
      const response = await portalApiClient.post<ApiEnvelope<MaintenanceRequestDto>>(`${tenant.apiPrefix}/maintenance-requests`, request)
      return response.data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...tenantKey, 'maintenance'] }),
  })
}

// --- Property owner (`/portal/owner`) — read-only by design ---

const owner = PORTAL_AREAS.PropertyOwner
const ownerKey = areaKey(owner)

export function useOwnerProperties() {
  return usePortalGet<OwnerPropertyDto[]>([...ownerKey, 'properties'], `${owner.apiPrefix}/properties`)
}
export function useOwnerProperty(id: string) {
  return usePortalGet<OwnerPropertyDetailDto>([...ownerKey, 'properties', 'detail', id], `${owner.apiPrefix}/properties/${id}`)
}
/** `from`/`to` omitted → the backend's default report range: the 1st of the current month to today. */
export function useOwnerRentCollected(range: { from?: string; to?: string } = {}) {
  return usePortalGet<RentCollectedRow[]>([...ownerKey, 'rent-collected'], `${owner.apiPrefix}/rent-collected`, { params: range })
}
export function useOwnerRevenue(range: { from?: string; to?: string } = {}) {
  return usePortalGet<PropertyRevenueRow[]>([...ownerKey, 'revenue'], `${owner.apiPrefix}/revenue`, { params: range })
}
export function useOwnerOverdueRent() {
  return usePortalGet<OverdueRentRow[]>([...ownerKey, 'overdue-rent'], `${owner.apiPrefix}/overdue-rent`)
}
export function useOwnerMaintenanceRequests() {
  return usePortalPagedList<MaintenanceRequestDto>([...ownerKey, 'maintenance'], `${owner.apiPrefix}/maintenance-requests`)
}

// --- Vendor (`/portal/vendor`) — read-only (no PO acceptance workflow exists in the domain) ---

const vendor = PORTAL_AREAS.Vendor
const vendorKey = areaKey(vendor)

export function useVendorPurchaseOrders(options: { pageSize?: number } = {}) {
  return usePortalPagedList<PurchaseOrderDto>([...vendorKey, 'purchase-orders'], `${vendor.apiPrefix}/purchase-orders`, {}, options)
}
export function useVendorPurchaseOrder(id: string) {
  return usePortalGet<PurchaseOrderDto>([...vendorKey, 'purchase-orders', 'detail', id], `${vendor.apiPrefix}/purchase-orders/${id}`)
}
export function useVendorAssignedWork(options: { pageSize?: number } = {}) {
  return usePortalPagedList<MaintenanceRequestDto>([...vendorKey, 'assigned-work'], `${vendor.apiPrefix}/assigned-work`, {}, options)
}

// --- Coworking member (`/portal/member`) ---

const member = PORTAL_AREAS.CoworkingMember
const memberKey = areaKey(member)

/** 404 when the member has no active membership — shown as "no active membership", not an error. */
export function useMemberActiveMembership() {
  return usePortalGet<MembershipDto>([...memberKey, 'membership'], `${member.apiPrefix}/membership`, { retry: false })
}
export function useMemberMemberships() {
  return usePortalPagedList<MembershipDto>([...memberKey, 'memberships'], `${member.apiPrefix}/memberships`)
}
export function useMemberBookings(options: { pageSize?: number } = {}) {
  return usePortalPagedList<CoworkingBookingDto>([...memberKey, 'bookings'], `${member.apiPrefix}/bookings`, {}, options)
}
export function useMemberBooking(id: string) {
  return usePortalGet<CoworkingBookingDto>([...memberKey, 'bookings', 'detail', id], `${member.apiPrefix}/bookings/${id}`)
}
