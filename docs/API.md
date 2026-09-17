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

Further modules append their endpoint list here as they ship.
