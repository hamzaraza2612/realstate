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
- `POST /api/v1/auth/login` — email/password → access token (15 min) + refresh token (7 days, httpOnly cookie or body for API clients).
- `POST /api/v1/auth/refresh` — rotates refresh token.
- `POST /api/v1/auth/logout` — revokes refresh token.
- Access token claims: `sub`, `tenant_id` (absent for Super Admin), `email`, `permissions` (or looked up server-side per request — see Application layer).

## Authorization
Endpoints declare required permission via `[RequirePermission("module.entity.action")]`.
403 if authenticated but missing permission; 401 if unauthenticated; tenant
mismatch on a resource → 404 (never leak existence across tenants).

## Pagination/filtering/sorting
Query params: `page`, `pageSize` (default 20, max 100), `sortBy`, `sortDir`
(`asc`/`desc`), plus entity-specific filters (e.g. `status`, `projectId`,
`dateFrom`, `dateTo`).

## Milestone 1 endpoints
- `POST /api/v1/auth/login|refresh|logout`
- `GET/POST /api/v1/organizations` (Super Admin: manage tenants)
- `GET/POST/PUT /api/v1/users`, `POST /api/v1/users/{id}/roles`
- `GET/POST/PUT/DELETE /api/v1/roles`, `GET /api/v1/permissions`
- `GET /api/v1/audit-logs` (filterable)
- `GET /api/v1/platform/organizations` (Super Admin only, cross-tenant)

Further modules append their endpoint list here as they ship.
