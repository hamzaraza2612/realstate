# Architecture

## Overview
Multi-tenant Real Estate ERP/SaaS platform. A single deployment (control plane +
shared database) serves many tenant organizations ("companies"). Tenant data is
isolated at the row level via a `TenantId` column + EF Core global query filters,
not via separate databases/schemas (simpler ops, cheaper for SMB tenants; can be
revisited per-tenant if a customer needs physical isolation later).

## Stack
- **Backend**: ASP.NET Core 8 Web API, C#, EF Core 8, PostgreSQL (Npgsql), ASP.NET
  Core Identity, JWT access + rotating refresh tokens, FluentValidation, Serilog,
  Swagger/OpenAPI, Hangfire (Postgres storage) for background jobs, AspNetCoreRateLimit
  for IP-based rate limiting.
- **Frontend**: React 19 + TypeScript + Vite, Tailwind CSS, hand-built Radix UI
  primitives styled in the shadcn/ui convention (`components/ui/*` — no external
  shadcn dependency, so no network fetch at setup time), TanStack Query, React
  Hook Form + Zod, Zustand (auth/theme state). Recharts is planned for the
  Reporting milestone, not yet wired in. The Projects/Inventory milestone's map
  view (`components/common/CoordinateMapView.tsx`) is a dependency-free
  bounding-box scatter plot, deliberately not a georeferenced map — a real
  basemap (Leaflet/OpenStreetMap or similar) is still open for a future GIS
  milestone once that's actually asked for.
- **Infra**: Docker Compose (Postgres, Redis, API, Web, reverse-proxy Nginx),
  env-based config via `.env`. Redis is provisioned in Compose for future
  distributed caching/rate-limiting but nothing reads it yet — rate limiting
  currently uses an in-memory store, fine for a single API instance.

## Solution layout (Clean Architecture)
```
backend/
  src/
    Api/                    # ASP.NET Core host: controllers, middleware, DI wiring
    Application/            # Use cases, DTOs, interfaces, validators (per module)
    Domain/                 # Entities, value objects, domain events (per module)
    Infrastructure/         # EF Core, Identity, storage, email, jobs (per module)
    Shared/                 # Cross-cutting kernel: Result, pagination, exceptions
  tests/
    UnitTests/
    IntegrationTests/
```
Each business module (Identity, Tenancy, CRM, Projects, Inventory, Sales,
Payments, Accounting, Construction, Procurement, PropertyManagement,
FacilityManagement, Coworking, Documents, Notifications, Approvals,
Communication, Reporting, Administration, Subscription) gets its own folder
inside Domain/Application/Infrastructure, and its own `IModule`-style DI
registration + `ModelBuilder` configuration, so modules stay loosely coupled
and new ones can be added without touching existing ones. Documents,
Notifications, and Approvals (Milestone 11) are the platform's cross-cutting
foundations, not owned by any one business module — each attaches to any
other entity via a polymorphic `(EntityType, EntityId)` pair rather than a
per-module table/FK, so a new module can attach documents, raise
notifications, or plug into the approval workflow without a schema change,
at the cost of the database not enforcing that the referenced row exists
(tenant isolation is preserved regardless, since these tables are
tenant-scoped independent of what they reference). Communication
(`ICommunicationService`/`IEmailSender`) is a provider-agnostic seam over
these — the only registered `IEmailSender` today is a development-safe
logging provider, so the whole application and every test run with zero
external SMTP dependency; a production deployment swaps in a real provider
implementing the same interface with nothing above it changing.

```
frontend/
  src/
    modules/<module>/       # feature-oriented: api.ts (React Query hooks) + *Page.tsx + dialogs
    components/ui/          # Radix-based primitives in the shadcn/ui convention
    components/layout/      # AppShell, Sidebar, Topbar, Breadcrumbs
    components/common/      # PageHeader, StateViews (loading/error/empty), ConfirmDialog, PermissionGate
    stores/                 # Zustand: authStore (session + permission checks), themeStore
    lib/                    # apiClient (axios + auto-refresh interceptor), utils
    app/                    # ProtectedRoute/PermissionRoute/SuperAdminRoute, queryClient
```
`PermissionGate` and the route guards read from the JWT-derived permission list
in `authStore`, mirroring the backend's permission model — a nav item or page
only renders if the signed-in user actually holds that permission (or is Super
Admin). A platform-only Super Admin account (no `tenantId`) sees a reduced nav
(Dashboard + Platform Admin only) since tenant-scoped pages don't apply to it.

## Multi-tenancy
- `TenantId` (Guid) on every tenant-owned entity, set via `ITenantContext`
  (resolved from the JWT claim `tenant_id` on each request).
- `AppDbContext` applies a global query filter `e.TenantId == _tenantContext.TenantId`
  on every tenant-scoped entity via reflection over `ITenantOwned`.
- `SaveChanges` interceptor stamps `TenantId`, `CreatedAt/By`, `UpdatedAt/By` and
  writes audit log entries.
- Super Admins operate outside any tenant (`tenant_id` claim absent) and use a
  separate set of platform-admin endpoints (`/api/v1/platform/*`) that are
  explicitly tenant-unscoped; they never get implicit cross-tenant reads on
  tenant endpoints.

## AuthN/AuthZ
- ASP.NET Core Identity (`AppUser`, custom `Role` is DB-driven, not enum-based).
- JWT access tokens (short-lived) + refresh tokens (rotating, stored hashed in DB).
- Permissions are granular strings (`sales.booking.create`) stored in a
  `Permissions` table, assigned to `Roles` via `RolePermissions`, and to users
  either through roles or (optionally) direct grants. Authorization uses a
  custom `PermissionRequirement`/`PermissionHandler` + `[RequirePermission("x")]`
  attribute — never a hard-coded role check.

## Audit logging
`AuditLog` entity capturing tenant, actor, action, module, entity type/id,
timestamp, IP, and before/after JSON snapshots. Written via an
`IAuditLogger` service called from application-layer command handlers for
sensitive operations, plus automatically for all tracked entity changes via
the `SaveChanges` interceptor (diff-based).

## API conventions
- Versioned routes: `/api/v1/...`.
- Consistent envelope: `{ data, error, meta }` for single/collection responses;
  paginated list endpoints return `{ data: [...], meta: { page, pageSize, total } }`.
- Errors: RFC 7807 `ProblemDetails` via a global exception-handling middleware,
  consistent error codes.
- FluentValidation validators run automatically via an MVC filter before the
  action executes.

## Background jobs
Hangfire with PostgreSQL storage for: installment due reminders, overdue
notices, lease-expiry notices, report generation, notification dispatch.

## Infra layout
```
backend/src/Api/Dockerfile      # 3 targets: build (SDK) -> runtime (aspnet, non-root, HEALTHCHECK)
                                 #            and migrator (SDK + dotnet-ef, for manual migrations)
frontend/Dockerfile             # multi-stage: node build (VITE_API_BASE_URL arg) -> nginx runtime
infra/nginx/reverse-proxy.conf  # top-level reverse proxy: /api/* + /health -> api, else -> web
docker-compose.yml              # postgres, redis, api, migrate (tools profile), web, nginx —
                                 # only nginx publishes a host port; healthchecks + service_healthy
                                 # depends_on throughout; postgres-data + uploads-data volumes
.env.example                    # documents every required env var; copy to .env, never commit it
```
The whole application is meant to run via Docker Compose end to end: no
dependency beyond Docker/Compose is required on the host, `docker compose up
-d --build` is the full startup command, migrations run automatically inside
the `api` container on boot (or manually via `docker compose --profile tools
run --rm migrate`), and Postgres data plus uploaded-file storage
(`uploads-data`, provisioned since Milestone 1 and in active use since the
Milestone 11 Documents module) persist in named volumes independent of
container lifecycle — both must be included in any backup strategy, since
document file content lives only on that volume, never in PostgreSQL. See
`docs/DEPLOYMENT.md` for the full production procedure, migrations, and
backup/restore instructions.

## Status
See `ROADMAP.md` for milestone-by-milestone delivery status.
