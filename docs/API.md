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

Further modules append their endpoint list here as they ship.
