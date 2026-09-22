# API Conventions

Base path: `/api/v1`. OpenAPI/Swagger at `/swagger` (dev only).

## Response envelope
```json
{ "data": { }, "error": null, "meta": null }
```
Paginated lists:
```json
{ "data": [ ], "error": null, "meta": { "page": 1, "pageSize": 20, "total": 137 } }
```
Errors use RFC 7807 ProblemDetails:
```json
{ "type": "...", "title": "Validation failed", "status": 400, "errors": { "email": ["required"] } }
```

## Auth
- `POST /api/v1/auth/login` — email/password → `{ accessToken, accessTokenExpiresAt, refreshToken, user }`.
  Access token expires in 15 minutes; refresh token in 7 days (both returned in
  the JSON body — SPA clients store the access token in memory and the refresh
  token in localStorage; see `frontend/src/lib/apiClient.ts` for the
  auto-refresh-on-401 interceptor).
- `POST /api/v1/auth/refresh` — rotates the refresh token (the old one is
  revoked immediately; reusing it fails).
- `POST /api/v1/auth/logout` — revokes the given refresh token.
- Access token claims: `sub`, `tenant_id` (absent for Super Admin), `email`,
  `role`, `permission` (one claim per granted permission, snapshotted at login
  — a permission/role change takes effect on next login or refresh, not
  mid-session, since authorization checks are a stateless claims check).

## Authorization
Endpoints declare required permission via `[RequirePermission("module.entity.action")]`
(dynamic policy, resolved by `PermissionPolicyProvider`), or `SuperAdminOnly`
for platform-only endpoints. 403 if authenticated but missing permission; 401
if unauthenticated; tenant mismatch on a resource → 404 (never leak existence
across tenants).

## Rate limiting
IP-based, via AspNetCoreRateLimit (`appsettings.json` → `IpRateLimiting`):
300 req/min general, 10/min on `/auth/login`, 20/min on `/auth/refresh`.
Disabled under the `Testing` ASP.NET Core environment (integration tests).

## Pagination/filtering/sorting
Query params: `page`, `pageSize` (default 20, max 100), `sortBy`, `sortDir`
(`asc`/`desc`), plus entity-specific filters (e.g. `status`, `projectId`,
`dateFrom`, `dateTo`).

## Milestone 1 endpoints
- `POST /api/v1/auth/login|refresh|logout`
- `GET/PUT /api/v1/organizations/me` (current tenant's own profile)
- `GET/POST/PUT /api/v1/users`, `GET /api/v1/users/{id}`, `POST /api/v1/users/{id}/deactivate`,
  `POST /api/v1/users/{id}/roles`
- `GET/POST/PUT/DELETE /api/v1/roles`, `GET /api/v1/permissions`
- `GET /api/v1/audit-logs` (filterable, tenant-scoped)
- `GET/POST /api/v1/platform/organizations`, `POST /api/v1/platform/organizations/{id}/status`
  (Super Admin only, cross-tenant)
- `GET/POST/PUT /api/v1/platform/subscription-plans` (Super Admin only)
- `GET /api/v1/platform/audit-logs` (Super Admin only, cross-tenant)

## Milestone 2 endpoints (CRM)
- `GET/POST/PUT/DELETE /api/v1/crm/leads`, `POST /api/v1/crm/leads/{id}/assign`,
  `POST /api/v1/crm/leads/{id}/convert` (creates a Customer, one-way, guarded against re-conversion)
- `GET/POST/PUT /api/v1/crm/customers` (no delete — customers may be linked from a converted lead)
- `GET/POST/PUT/DELETE /api/v1/crm/activities`, `POST /api/v1/crm/activities/{id}/complete`
- `GET /api/v1/crm/dashboard` (tenant-scoped pipeline/follow-up metrics)

## Milestone 3 endpoints (Projects + Inventory)
- `GET/POST/PUT/DELETE /api/v1/projects` (delete blocked while the project still has hierarchy
  nodes or inventory units — `409 Conflict`)
- `GET/POST/PUT/DELETE /api/v1/projects/nodes` (hierarchy: phase/zone/block/building/floor;
  `GET` takes `?projectId=`; delete blocked while the node still has children — `409 Conflict`)
- `GET/POST/PUT/DELETE /api/v1/inventory` (filterable by `projectId`, `nodeId`, `type`, `status`,
  `minArea`/`maxArea`, `search`; delete only allowed while `status = Available` — `409 Conflict`
  otherwise), `POST /api/v1/inventory/{id}/status` (enforces `InventoryStatusRules` — invalid
  transitions return `400`)

## Milestone 4 endpoints (Sales Booking & Payment Plans)
- `GET/POST/PUT /api/v1/sales/bookings` (no delete — cancellation is a status transition, not a
  deletion, to preserve audit history), `POST /api/v1/sales/bookings/{id}/submit|approve|cancel`
  (status transitions enforced server-side; `PUT` only succeeds while the booking is still `Draft`)
- `GET/POST /api/v1/sales/bookings/{bookingId}/payment-plan` (one plan per booking; `POST` fails with
  `409`-equivalent `400 conflict` if one already exists, or `schedule_mismatch` if the schedule doesn't
  reconcile with the booking's net price)
- `GET/POST /api/v1/sales/bookings/{bookingId}/payments` (`POST` records a payment against one
  installment; rejects amounts beyond that installment's outstanding balance with `overpayment_not_allowed`)
- `GET /api/v1/sales/dashboard` (tenant-scoped booking/inventory/collections summary)

## Milestone 5 endpoints (Finance & Accounting Foundation)
- `GET/POST/PUT/DELETE /api/v1/finance/accounts` (delete blocked while the account has child accounts,
  journal activity, or is a seeded system account — `409 Conflict`; hierarchy changes that would create
  a cycle return `400 invalid_hierarchy`)
- `GET/POST /api/v1/finance/journal-entries`, `POST /api/v1/finance/journal-entries/{id}/post|cancel`
  (manual entries are created as `Draft`; `post`/`cancel` only succeed from `Draft` — a `Posted` entry is
  immutable, there is no edit endpoint; unbalanced entries are rejected with `400 unbalanced` at both
  creation and posting)
- `GET /api/v1/finance/receivables` (a projection over Sales installments, not its own table — filterable
  by `customerId`, `status`, `overdueOnly`)
- `GET /api/v1/finance/dashboard` (tenant-scoped revenue/collections/receivables/balance-sheet summary)
- `GET /api/v1/finance/reports/trial-balance`, `GET /api/v1/finance/reports/income-summary?from=&to=`

## Milestone 6 endpoints (Construction & Procurement)
- `GET/POST/PUT/DELETE /api/v1/construction/work-packages` (filterable by `projectId`, `status`,
  `managerUserId`, `search`; delete blocked while the work package has tasks, expenses, or purchase
  orders — `409 Conflict`), `POST /api/v1/construction/work-packages/{id}/status` (enforces
  `WorkPackageStatusRules`)
- `GET/POST/PUT/DELETE /api/v1/construction/tasks` (filterable by `workPackageId`, `status`,
  `assignedToUserId`, `search`), `POST /api/v1/construction/tasks/{id}/status` (enforces
  `ConstructionTaskStatusRules`; completing a task auto-sets progress to 100%)
- `GET/POST/PUT/DELETE /api/v1/procurement/vendors` (delete blocked while the vendor has purchase
  orders — `409 Conflict`)
- `GET/POST/PUT /api/v1/procurement/purchase-requests` (`PUT` only while `Draft`, replaces all lines),
  `POST /api/v1/procurement/purchase-requests/{id}/submit|approve|reject|cancel` (enforces
  `PurchaseRequestStatusRules`; approve/reject requires a separate permission from create/submit)
- `GET/POST/PUT /api/v1/procurement/purchase-orders` (`PUT` only while `Draft`; `subtotal`/`total` are
  always computed server-side from line quantity × unit price, discount, and tax — never trusted from
  the client), `POST /api/v1/procurement/purchase-orders/{id}/submit|approve|send|cancel` (enforces
  `PurchaseOrderStatusRules`)
- `GET/POST /api/v1/procurement/purchase-orders/{purchaseOrderId}/receipts` (`POST` records a goods
  receipt against one or more PO lines; rejects with `409 over_receiving` if the requested quantity
  would exceed the line's outstanding ordered quantity — enforced both in the application layer and by
  a DB `CHECK` constraint; auto-transitions the PO to `PartiallyReceived`/`Received` and, for lines with
  a linked material, increments that material's stock and records a `StockMovement`)
- `GET/POST/PUT/DELETE /api/v1/materials` (filterable by `category`, `isActive`, `search`; delete
  blocked while the material has stock movement history), `GET/POST /api/v1/materials/{id}/movements`
  (`POST` records a manual Receipt/Issue/Adjustment; rejects with `400 insufficient_stock` if it would
  take current quantity negative)
- `GET/POST /api/v1/construction/expenses` (no update endpoint — an expense is created `Pending` and
  only ever approved or rejected, never edited), `POST /api/v1/construction/expenses/{id}/approve|reject`
  (`approve` posts a balanced journal entry — Dr Construction Expenses, Cr Accounts Payable — in the
  same transaction as the status change; `reject` posts nothing)
- `GET /api/v1/construction/dashboard`, `GET /api/v1/procurement/dashboard` (tenant-scoped)

## Milestone 7 endpoints (Property & Rental Management)
- `GET/POST/PUT/DELETE /api/v1/property/properties` (filterable by `type`, `status`, `search`; delete
  blocked while the property still has units — `409 Conflict`)
- `GET/POST/PUT/DELETE /api/v1/property/units` (filterable by `propertyId`, `type`, `status`, `search`),
  `POST /api/v1/property/units/{id}/status` (enforces `PropertyUnitStatusRules`; `Occupied` cannot be
  set or cleared through this endpoint — it's exclusively driven by lease activation/termination —
  `400 invalid_transition` otherwise)
- `GET/POST/PUT/DELETE /api/v1/property/tenants` (filterable by `isActive`, `search`; `POST` accepts
  either an existing `customerId` or a `fullName`/contact set to create a new Customer in the same call;
  delete blocked while the tenant has lease history)
- `GET/POST/PUT /api/v1/property/leases` (filterable by `propertyId`, `unitId`, `rentalTenantId`,
  `status`, `search`; no delete — cancellation is a status transition; `PUT` only while `Draft`),
  `POST /api/v1/property/leases/{id}/submit|approve|expire|terminate|cancel` (enforces
  `LeaseStatusRules`; `approve` is what generates the rent schedule and occupies the unit; creating a
  lease on a unit that already has a non-terminal lease returns `409 unit_has_active_lease`)
- `GET /api/v1/property/leases/{id}/rent-schedule` (generated deterministically at lease approval, never
  hand-edited), `GET/POST /api/v1/property/leases/{id}/payments` (`POST` rejects amounts beyond a
  schedule line's outstanding balance with `400 overpayment_not_allowed`, honors an `idempotencyKey` to
  make retried submissions safe, and posts a Finance journal entry atomically with the payment),
  `GET /api/v1/property/leases/{id}/security-deposit`
- `POST /api/v1/property/security-deposits/{id}/receive|refund|forfeit` (enforces
  `SecurityDepositStatusRules`; `refund` rejects amounts beyond the remaining held balance with
  `400 overrefund_not_allowed`)
- `GET/POST /api/v1/property/maintenance-requests` (filterable by `propertyId`, `unitId`, `status`,
  `priority`, `search`), `POST /api/v1/property/maintenance-requests/{id}/assign` (vendor assignment
  reuses the existing `procurement/vendors` catalog by id — no new vendor endpoint),
  `POST /api/v1/property/maintenance-requests/{id}/status` (enforces `MaintenanceStatusRules`)
- `GET /api/v1/property/dashboard`, `GET /api/v1/property/rental-dashboard` (tenant-scoped)

## Milestone 8 endpoints (Facility Management, Shopping Mall & Coworking)
Shared foundation:
- `GET/POST/PUT/DELETE /api/v1/facilities` (filterable by `type`, `status`, `search`; delete blocked
  while the facility still has spaces — `409 Conflict`)
- `GET/POST/PUT/DELETE /api/v1/facility/spaces` (filterable by `facilityId`, `type`, `status`, `search`),
  `POST /api/v1/facility/spaces/{id}/status` (`Occupied` cannot be set/cleared here — it's driven
  exclusively by lease activation/termination for mall shops — `400 invalid_transition` otherwise)
- `GET/POST /api/v1/facility/utility-readings` (filterable by `facilityId`, `propertyId`, `type`,
  `meterReference`; `POST` rejects a reading lower than the previous one for the same meter with
  `400 invalid_reading`; consumption/amount are computed and stored at reading time)
- `GET/POST /api/v1/facility/service-requests`, `POST /api/v1/facility/service-requests/{id}/status`
  (a generic operational request — cleaning/security/IT/front-desk — that reuses
  `Property.MaintenancePriority`/`MaintenanceStatus`/`MaintenanceStatusRules`)
- `GET /api/v1/facility/payments?sourceType=&sourceId=`, `POST /api/v1/facility/payments` — one shared
  payment endpoint for every billing subtype (`sourceType`: ServiceCharge/Parking/CoworkingMembership/
  CoworkingBooking/Utility); rejects overpayment with `400 overpayment_not_allowed` and posts to Finance
  atomically; honors an `idempotencyKey` for safe retries
- `GET /api/v1/facility/dashboard` (tenant-scoped)
- `POST /api/v1/property/maintenance-requests` was extended (additively) to accept optional
  `facilityId`/`spaceId`/`slaHours` alongside its existing `propertyId`/`unitId` — either `propertyId`
  or `facilityId` must be given; `propertyId` is derived from the facility when omitted

Mall (built on the shared foundation, not a parallel system):
- `GET/POST/PUT /api/v1/facility/mall/shops` (`POST` creates the backing PropertyUnit and the Space
  together in one call; shop leasing itself is the existing `POST /api/v1/property/leases`, unmodified)
- `GET/POST /api/v1/facility/mall/service-charges/definitions`,
  `PUT /api/v1/facility/mall/service-charges/definitions/{id}`,
  `GET /api/v1/facility/mall/service-charges/charges`,
  `POST /api/v1/facility/mall/service-charges/charges/generate` (amount is always server-computed,
  deterministically, from the definition; `409 duplicate_charge` if that definition/lease/period was
  already generated)
- `GET/POST /api/v1/facility/mall/parking/spaces`, `GET/POST /api/v1/facility/mall/parking/allocations`,
  `POST /api/v1/facility/mall/parking/allocations/{id}/end` (`400 space_not_available` if the space
  isn't free; a partial unique index allows only one Active allocation per parking space)
- `GET/POST /api/v1/facility/mall/events`, `POST /api/v1/facility/mall/events/{id}/status`
- `GET/POST /api/v1/facility/mall/notices`, `POST /api/v1/facility/mall/notices/{id}/status`
- `GET /api/v1/facility/mall/dashboard?facilityId=` (`facilityId` optional — omit to aggregate all mall
  facilities)

Coworking (built on the shared foundation):
- `GET/POST/PUT /api/v1/facility/coworking/members` (overlays the existing CRM Customer, same pattern
  as Property's RentalTenant)
- `GET/POST/PUT /api/v1/facility/coworking/plans`
- `GET/POST /api/v1/facility/coworking/memberships`, `POST /api/v1/facility/coworking/memberships/{id}/status`
  (Active → Expired/Cancelled, both terminal — no reactivation)
- `GET/POST/PUT /api/v1/facility/coworking/desks`, `GET/POST/PUT /api/v1/facility/coworking/rooms`
- `GET/POST /api/v1/facility/coworking/bookings`, `POST /api/v1/facility/coworking/bookings/{id}/status`
  (price is always server-computed from the resource's rate × duration; `409 overlapping_booking` if the
  resource is already booked for an overlapping time range — enforced by a Postgres range-EXCLUDE
  constraint in addition to an application-level pre-check)
- `GET /api/v1/facility/coworking/dashboard?facilityId=` (`facilityId` optional)

## Milestone 10 endpoints (Security & Finance Hardening)
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` now also reject a Suspended/Cancelled tenant's
  user with `401 Unauthorized` (`tenant_suspended`/`tenant_cancelled`) — same status code and shape as
  an invalid-credentials failure, so a client can't distinguish "wrong password" from "tenant suspended"
  without reading the error message (deliberate — don't leak tenant state pre-authentication). Every
  other protected endpoint now also returns `403 Forbidden` for a request carrying an otherwise-valid
  token whose tenant has since been suspended/cancelled (enforced by `TenantStatusMiddleware`, not
  per-controller — no controller code changed).
- `GET/POST /api/v1/finance/fiscal-periods`, `POST /api/v1/finance/fiscal-periods/{id}/close`,
  `POST /api/v1/finance/fiscal-periods/{id}/reopen` — `POST` (create) rejects an overlapping range with
  `400 overlapping_period`; close/reopen reject an already-closed/already-open period with
  `400 already_closed`/`400 already_open`. Permission: `finance.reports.view` to list, `finance.manage`
  to create/close/reopen (same permissions the existing Journal Entries endpoints already use).
- `POST /api/v1/finance/journal-entries/{id}/reverse` body `{ reversalDate?, reason? }` — only a Posted
  entry can be reversed (`400 invalid_state` otherwise); a second reversal attempt is rejected with
  `400 already_reversed`; a reversal dated into a closed fiscal period is rejected with
  `400 period_closed` exactly like any other posting. `GET`/list responses for `journal-entries` now
  also include `isReversed` and `reversalOfEntryId` on every entry.
- `GET /api/v1/construction/expenses/{id}/payments`, `POST /api/v1/construction/expenses/{id}/payments`
  body `{ amount, paymentDate, referenceNumber?, notes?, idempotencyKey? }` — AP clearing against an
  Approved expense; rejects `400 expense_not_approved` if the expense isn't Approved yet, and
  `400 overpayment_not_allowed` beyond the outstanding balance (`amount - paidAmount`), honoring
  `idempotencyKey` for safe retries exactly like the existing Rent/Facility payment endpoints. The
  existing `GET /api/v1/construction/expenses`/`{id}` responses now also include `paidAmount`.
- `GET /api/v1/finance/reports/balance-sheet?asOf=` (optional, defaults to today), returning Assets/
  Liabilities/Equity broken down by account plus `netIncome` and a `totalLiabilitiesAndEquity` that
  always equals `totalAssets` by double-entry construction (`totalAssets = totalLiabilities + totalEquity
  + netIncome` — verified live, not just asserted).
- `GET /api/v1/finance/reports/profit-and-loss?from=&to=` (both optional), returning revenue/expense
  lines broken down by account alongside the existing, unmodified `income-summary` endpoint's totals-only
  view.
- `GET /api/v1/finance/reports/cash-flow?from=&to=` (both optional), returning cash inflows/outflows
  grouped by the posting's `referenceType`, with `openingCash + netChange == closingCash` (verified live).
  All three new report endpoints share the existing `finance.reports.view` permission with Trial Balance/
  Income Summary.

## Milestone 11 endpoints (Documents + Notifications + Approvals + Communication Foundation)

Documents (generic — attaches to any `DocumentEntityTypes` value: Customer/Lead/Booking/Payment/
Project/Property/PropertyUnit/Lease/RentalTenant/Vendor/PurchaseOrder/PurchaseRequest/Expense/
Facility/MaintenanceRequest/Other):
- `GET /api/v1/documents?entityType=&entityId=&category=&search=` — permission `documents.view`.
- `GET /api/v1/documents/{id}` — returns `{ document, versions[] }`, versions newest-first.
- `POST /api/v1/documents` — `multipart/form-data` (`EntityType`, `EntityId`, `Category`, `Title`,
  `Description`, `File`), permission `documents.manage`. Rejects `400 empty_file`,
  `400 file_too_large` (`Storage:MaxFileSizeMb`, default 25), `400 unsupported_file_type` (not in
  `Storage:AllowedContentTypes`), `400 content_type_mismatch` (declared Content-Type doesn't match the
  file's actual magic bytes), `400 unknown_entity_type`.
- `POST /api/v1/documents/{id}/versions` — `multipart/form-data` (`File` only) — adds a new, immutable
  version; never overwrites a prior one.
- `GET /api/v1/documents/{id}/download?version=` (version optional, defaults to latest) — streams the
  file with the original filename/Content-Type restored from metadata; the storage key itself is never
  exposed to the client.
- `DELETE /api/v1/documents/{id}` — permission `documents.manage`; removes the document, every version,
  and the underlying stored files together.

Notifications (no permission gate — every action is scoped to the caller's own `UserId` server-side):
- `GET /api/v1/notifications?unreadOnly=&category=`, `GET /api/v1/notifications/unread-count`.
- `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`.
- `GET /api/v1/notifications/preferences` (always returns one row per `NotificationCategory`, defaulting
  to both channels enabled), `PUT /api/v1/notifications/preferences` (one category at a time).

Approvals (generic — same `(EntityType, EntityId)` pattern as Documents):
- `GET /api/v1/approvals/inbox?status=` — no permission gate; scoped to requests where the caller is
  the named approver or holds the request's `requiredPermission`. Omitting `status` returns Pending only.
- `GET /api/v1/approvals/entity?entityType=&entityId=` — full history for one entity, permission
  `approvals.view`.
- `GET /api/v1/approvals/{id}` — permission `approvals.view`.
- `POST /api/v1/approvals` — direct creation for the foundation itself (existing modules create
  requests internally, not through this endpoint).
- `POST /api/v1/approvals/{id}/decide` body `{ approve, decisionComments? }` — `403` if the caller is
  neither the named approver nor holds the required permission; `400 already_decided` if someone else
  already decided it (a real, expected race, not a bug — see the concurrent-decision test). Deciding an
  Expense/PurchaseOrder/Booking's linked request here also drives that entity's own
  approve/reject/cancel action (bidirectional — see `docs/ROADMAP.md` Milestone 11 for how).

Communication (diagnostic/support visibility, not an end-user feature):
- `GET /api/v1/communication-logs?recipientUserId=&entityType=&entityId=&status=` — permission
  `audit_logs.view` (reused, since this is the same kind of cross-cutting sensitive data).

Further modules append their endpoint list here as they ship.
