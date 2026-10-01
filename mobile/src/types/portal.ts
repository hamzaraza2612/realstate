import type { PaymentDto, RentPaymentDto } from './modules'

/**
 * Response shapes that exist only on the external-portal endpoints (backend/src/Application/Portal/
 * *.cs and Application/Reporting/Property/PropertyReportsModule.cs), mirrored from the web
 * `frontend/src/types/api.ts`. Domain DTOs the portal reuses verbatim (BookingDto, LeaseDto,
 * PurchaseOrderDto, …) stay in `types/modules.ts`.
 */

/** `GET /portal/customer/payments` — `CustomerPortalPaymentRow`. */
export interface PortalBookingPaymentEntry {
  bookingId: string
  bookingNumber: string
  payment: PaymentDto
}

/** `GET /portal/tenant/payments` — `TenantPortalPaymentRow`. */
export interface PortalLeasePaymentEntry {
  leaseId: string
  leaseNumber: string
  payment: RentPaymentDto
}

/** `POST /portal/tenant/maintenance-requests` — `CreateTenantMaintenanceRequest`. The property and
 * unit are derived server-side from the lease (Active or PendingApproval only). */
export interface CreateTenantMaintenanceRequest {
  leaseId: string
  category: number
  priority: number
  description: string
}

/** `GET /portal/owner/properties` — `OwnerPropertyDto` (occupancyRate is a 0–100 percentage). */
export interface OwnerPropertyDto {
  id: string
  code: string
  name: string
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
}

/** `OwnerUnitDto`. NB: `status` is the C# enum NAME as a string ("Occupied", "Available", …) — the
 * backend builds it with `.ToString()`, unlike the numeric enums elsewhere. */
export interface OwnerUnitDto {
  id: string
  unitNumber: string
  status: string
  tenantName: string | null
  marketRentRate: number | null
}

/** `GET /portal/owner/properties/{id}` — `type`/`status` are enum NAMES as strings (see above). */
export interface OwnerPropertyDetailDto {
  id: string
  code: string
  name: string
  type: string
  status: string
  units: OwnerUnitDto[]
}

/** `GET /portal/owner/rent-collected` — `RentCollectedRowDto` (sum of rent payments in [from, to]). */
export interface RentCollectedRow {
  propertyId: string
  propertyName: string
  amountCollected: number
}

/** `GET /portal/owner/overdue-rent` — `OverdueRentRowDto` (as of now). */
export interface OverdueRentRow {
  leaseId: string
  leaseNumber: string
  propertyId: string
  propertyName: string
  tenantName: string
  outstandingAmount: number
  dueDate: string
  daysPastDue: number
}

/** `GET /portal/owner/revenue` — `PropertyRevenueRowDto`. */
export interface PropertyRevenueRow {
  propertyId: string
  propertyName: string
  revenue: number
}
