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

Reporting (Milestone 12) — every route below requires permission `reports.view` (one tenant-wide
permission for the whole area, same precedent as `documents.view`/`approvals.view`); full KPI/report
definitions are in `docs/REPORTING.md`, not repeated here. Any route marked (csv) also accepts
`?format=csv` to download the same rows as a file instead of the JSON envelope:
- `GET /api/v1/reports/executive?from=&to=` — the cross-module management dashboard.
- `GET /api/v1/reports/sales/{by-project|by-period|by-agent}?from=&to=&projectId=&agentUserId=&customerId=&status=` (csv)
- `GET /api/v1/reports/sales/booking-status?...`, `GET /api/v1/reports/sales/conversion?from=&to=`
- `GET /api/v1/reports/sales/cancellations?page=&pageSize=&...` (paged)
- `GET /api/v1/reports/sales/collections?...` (csv), `GET /api/v1/reports/sales/receivable-aging` (csv)
- `GET /api/v1/reports/sales/outstanding-installments?page=&pageSize=&customerId=&status=&overdueOnly=&search=`
  — delegates directly to the existing Finance Receivables list (`IReceivableService`), not duplicated.
- `GET /api/v1/reports/finance/ar-aging` (csv), `GET /api/v1/reports/finance/ap-aging` (csv) — new
  reports only; Trial Balance/Income Summary/Balance Sheet/P&L/Cash Flow remain at their existing
  `/finance/reports/*` routes.
- `GET /api/v1/reports/finance/{revenue-trend|expense-trend|collections-trend}?from=&to=` — monthly series.
- `GET /api/v1/reports/projects/{inventory-availability|sold-vs-available|sales-summary|collection-summary|financial-summary|progress}?projectId=&from=&to=` (csv)
- `GET /api/v1/reports/construction/work-package-progress?projectId=&status=` (csv)
- `GET /api/v1/reports/construction/{expenses|budget-vs-actual}?projectId=&from=&to=` (csv)
- `GET /api/v1/reports/procurement/{purchase-order-exposure|received-vs-ordered|vendor-spend|status}?purchaseOrderId=&from=&to=` (csv, except `status`)
- `GET /api/v1/reports/property/{occupancy|rent-billed|rent-collected|overdue-rent|revenue|tenant-aging|lease-status}?from=&to=` (csv, except `lease-status`)
- `GET /api/v1/reports/facility/{utilization|mall-occupancy|service-charge-collection|revenue|parking|coworking-desk-utilization|meeting-room-utilization|maintenance-backlog}?from=&to=` (csv)
- `GET /api/v1/reports/facility/{events|booking-trends}?from=&to=` (no export — small/no-drilldown shape)

## External Portals (Milestone 13)

Full architecture (identity model, JWT claim scheme, authorization isolation) is in
`docs/PORTAL_ARCHITECTURE.md`, not repeated here.

Portal auth (`AllowAnonymous` except `me`; no `[RequirePermission]` — a portal token carries no
internal roles):
- `POST /api/v1/portal/auth/login` body `{ tenantSlug, email, password }` — `401` on any failure
  (unknown tenant, unknown email, wrong password, deactivated account, locked out), same
  non-enumeration convention as internal login.
- `POST /api/v1/portal/auth/refresh` body `{ refreshToken }`, `POST /api/v1/portal/auth/logout` body `{ refreshToken }`.
- `POST /api/v1/portal/auth/request-password-reset` body `{ tenantSlug, email }` — always `204`
  regardless of whether the email matched an account.
- `POST /api/v1/portal/auth/reset-password` body `{ token, newPassword }`.
- `GET /api/v1/portal/auth/me` — `[RequirePortal]`; returns the caller's own profile (actor type,
  actor id, display name, tenant).

Internal-staff administration of portal logins — `[RequirePermission(portal.manage_accounts)]`,
one permission spans all five actor types:
- `GET /api/v1/portal-accounts?actorType=&actorId=` — paged.
- `POST /api/v1/portal-accounts/invite` body `{ actorType, actorId, email? }` — `400 already_invited`
  if the actor already has a portal account, `400 actor_not_found` if the id doesn't resolve to a
  real, same-tenant row of that type, `400 email_required`/`400 email_taken` for email conflicts.
- `POST /api/v1/portal-accounts/{id}/deactivate`, `POST /api/v1/portal-accounts/{id}/reactivate`.

`PropertyOwner` CRUD (internal, `property.view`/`property.manage` — new in this milestone since no
first-class owner entity existed before):
- `GET /api/v1/property/owners?isActive=&search=`, `GET /api/v1/property/owners/{id}`.
- `POST /api/v1/property/owners`, `PUT /api/v1/property/owners/{id}`.
- `POST /api/v1/property/owners/{ownerId}/properties/{propertyId}` — links a property to an owner
  (a property has at most one linked owner in this milestone, not co-ownership).
- `DELETE /api/v1/property/owners/properties/{propertyId}/link` — unlinks.

Every portal-area route below requires `[RequirePortal]` **and** the controller's own
`RequiredActorType` check (a Vendor token cannot reach `/portal/tenant/*`, etc. — see
`docs/PORTAL_ARCHITECTURE.md`). Every object-level access (a specific booking/lease/property/PO/
membership id) additionally verifies the caller owns that row; a mismatch is `404`, never `403`,
so a portal user can never distinguish "doesn't exist" from "exists but isn't yours" — except the
Tenant Portal's `POST maintenance-requests`, whose ownership failure surfaces as `400` like every
other create-endpoint failure in this codebase.

Customer Portal (`api/v1/portal/customer`, `RequiredActorType = Customer`):
- `GET bookings`, `GET bookings/{id}`, `GET bookings/{id}/payment-plan`, `GET bookings/{id}/payments`, `GET payments`.
- `GET documents`, `GET documents/{id}/download?version=`.
- `GET notifications?unreadOnly=&category=`, `GET notifications/unread-count`,
  `POST notifications/{id}/read`, `POST notifications/read-all`.

Tenant Portal (`api/v1/portal/tenant`, `RequiredActorType = RentalTenant`):
- `GET leases`, `GET leases/{id}`, `GET leases/{id}/rent-schedule`, `GET leases/{id}/payments`, `GET payments`.
- `GET leases/{id}/security-deposit`.
- `GET maintenance-requests`, `POST maintenance-requests` body `{ leaseId, category, priority, description }`.
- `GET documents`, `GET documents/{id}/download?version=`.
- `GET notifications?...`, `GET notifications/unread-count`, `POST notifications/{id}/read`, `POST notifications/read-all`.

Owner Portal (`api/v1/portal/owner`, `RequiredActorType = PropertyOwner`, read-only):
- `GET properties`, `GET properties/{id}` (includes per-unit occupant/rent detail).
- `GET rent-collected?from=&to=`, `GET overdue-rent`, `GET revenue?from=&to=` — all reuse Milestone
  12's `IPropertyReportService`, filtered down to this owner's own property ids.
- `GET maintenance-requests`.
- `GET documents`, `GET documents/{id}/download?version=`.
- `GET notifications?...`, `GET notifications/unread-count`, `POST notifications/{id}/read`, `POST notifications/read-all`.

Vendor Portal (`api/v1/portal/vendor`, `RequiredActorType = Vendor`):
- `GET purchase-orders`, `GET purchase-orders/{id}`, `GET assigned-work` (maintenance requests assigned to this vendor).
- `GET documents`, `GET documents/{id}/download?version=`.
- `GET notifications?...`, `GET notifications/unread-count`, `POST notifications/{id}/read`, `POST notifications/read-all`.

Coworking Member Portal (`api/v1/portal/member`, `RequiredActorType = CoworkingMember`):
- `GET membership` (active only, `404` if none), `GET memberships` (full history), `GET bookings`, `GET bookings/{id}`.
- `GET documents`, `GET documents/{id}/download?version=`.
- `GET notifications?...`, `GET notifications/unread-count`, `POST notifications/{id}/read`, `POST notifications/read-all`.
- No payment-history endpoint: Facility billing has no read-side "list payments for X" service
  (only a write-side `FacilityPaymentService`), so none is fabricated here.

Agent/Broker Portal (`api/v1/agent-portal`) — plain `[Authorize]`, **not** `[RequirePortal]`: this
reuses the caller's existing internal `AppUser` session rather than a `PortalUser`, since an agent
is already internal staff (see `docs/PORTAL_ARCHITECTURE.md` for why). Every action is self-scoped
to the caller's own `UserId`:
- `GET leads`, `GET customers`, `GET available-inventory`, `GET bookings`, `GET follow-ups`.
- `GET performance?from=&to=` — reuses `ISalesReportService.SalesByPeriodAsync` filtered to the
  caller's own agent id. No commission endpoint exists — the domain model has no commission data.

## SaaS Control Plane & Billing (Milestone 14)

Full architecture (entitlement resolution order, Tenant.Status↔Subscription.Status mapping, the
five enforced limits, the three enforced feature gates) is in `docs/SAAS_BILLING.md`, not repeated
here. Every entitlement/limit violation returns `{ title, status, code: "feature_not_entitled" |
"limit_exceeded" }`.

Platform admin (Super Admin only, `PlatformControllerBase`/`SuperAdminOnly` policy — same pattern as
every pre-existing `/platform/*` route):
- `GET /api/v1/platform/subscription-plans`, `GET /api/v1/platform/subscription-plans/{id}` —
  now include `code`, `description`, `displayOrder`, `trialDays`, `currency`, `setupPrice`,
  `metadataJson`, `entitlements: [{code, type, boolValue, numericValue}]`.
- `POST /api/v1/platform/subscription-plans`, `PUT /api/v1/platform/subscription-plans/{id}` — body
  includes `entitlements: [{code, boolValue?, numericValue?}]`; `400 code_taken` if the plan `code`
  already exists.
- `GET /api/v1/platform/organizations/{id}/subscription` — the tenant's current non-terminal
  subscription, `404` if none.
- `POST /api/v1/platform/organizations/{id}/subscription` body `{ planId, skipTrial }` — assigns a
  plan and starts a subscription (Trialing unless `skipTrial` or the plan's `trialDays` is 0);
  `400 already_subscribed` if the tenant already has a non-terminal subscription.
- `GET /api/v1/platform/organizations/{id}/usage` — `TenantUsageDto` (counts + per-limit
  Normal/Approaching/AtLimit metrics).
- `GET /api/v1/platform/organizations/{id}/entitlements` — `{ effective: [...], overrides: [...] }`.
- `PUT /api/v1/platform/organizations/{id}/entitlements` body `{ code, boolValue?, numericValue? }` —
  upserts a `TenantEntitlementOverride`.
- `DELETE /api/v1/platform/organizations/{id}/entitlements/{code}` — removes the override (falls
  back to the plan's own value).
- `GET /api/v1/platform/subscriptions` — cross-tenant subscription list.
- `POST /api/v1/platform/subscriptions/{id}/transition` body `{ toStatus, reason? }` —
  `400 invalid_transition` if `SubscriptionStatusRules.CanTransition` rejects it;
  `400 concurrency_conflict` on a losing `xmin` race.
- `GET /api/v1/platform/invoices?tenantId=&status=` (paged), `GET /api/v1/platform/invoices/{id}`.
- `POST /api/v1/platform/invoices/generate` body `{ subscriptionId, taxAmount, lineItems?, dueInDays }`.
- `GET /api/v1/platform/invoices/{id}/payments`.
- `POST /api/v1/platform/invoices/{id}/payments` body `{ amount, paymentDate, providerTransactionId?, idempotencyKey }`
  — idempotent on `idempotencyKey`; a repeat request returns the original payment, never a duplicate.

Tenant-facing billing view (`subscription.view` permission — one tenant-wide permission, same
precedent as `documents.view`/`reports.view`; every action reads the ambient tenant, no id
parameter anywhere, so there is nothing for a caller to substitute for another tenant's):
- `GET /api/v1/subscription` — the caller's own current subscription.
- `GET /api/v1/subscription/usage` — the caller's own usage metrics.
- `GET /api/v1/subscription/entitlements` — the caller's own effective entitlements.
- `GET /api/v1/billing/invoices` (paged), `GET /api/v1/billing/invoices/{id}`.
- `GET /api/v1/billing/payments` — the caller's own payment history.

Further modules append their endpoint list here as they ship.
