# Roadmap

Status legend: ✅ done · 🚧 in progress · ⬜ not started

| Milestone | Scope | Status |
|---|---|---|
| 0 | Discovery + docs | ✅ |
| 1 | Foundation: solution structure, DB, tenancy, auth, RBAC, org mgmt, audit log, API conventions, frontend shell | 🚧 |
| 2 | CRM: leads, sources, campaigns, pipeline, activities, conversion | ⬜ |
| 3 | Projects + Inventory: projects, societies, blocks, units, mapping | ⬜ |
| 4 | Sales: bookings, pricing, installments, approvals, payments, receipts | ⬜ |
| 5 | Finance: chart of accounts, journals, receivables/payables, reports | ⬜ |
| 6 | Construction: phases, BOQ, procurement, vendors, materials, workforce | ⬜ |
| 7 | Property/Rental: properties, tenants, leases, rent, maintenance | ⬜ |
| 8 | Facility: mall, coworking, facility management | ⬜ |
| 9 | Portals: customer/tenant/member portals | ⬜ |
| 10 | Documents + Notifications + approval workflows | ⬜ |
| 11 | Reporting: dashboards, exports | ⬜ |
| 12 | SaaS: subscriptions, plans, entitlements, super-admin | ⬜ |
| 13 | Production hardening: security, tests, Docker, CI/CD, docs | ⬜ |

## Milestone 1 — Foundation (current)
- [x] Repo/docs scaffold
- [ ] Backend solution (`backend/RealEstateErp.sln`) with Api/Application/Domain/Infrastructure/Shared
- [ ] PostgreSQL EF Core setup + initial migration
- [ ] Tenant model + `ITenantContext` + global query filters
- [ ] ASP.NET Core Identity + JWT access/refresh tokens
- [ ] Permission-based RBAC (Roles, Permissions, RolePermissions)
- [ ] Organization (tenant) CRUD + Super Admin bootstrap
- [ ] Audit logging (interceptor + service)
- [ ] Global error handling middleware + ProblemDetails
- [ ] Serilog structured logging
- [ ] Swagger/OpenAPI
- [ ] Frontend shell (Vite+React+TS+Tailwind+shadcn/ui): login, dashboard shell, nav, org switcher
- [ ] Docker Compose (Postgres, Redis, API, Web, Nginx) + `.env.example`
- [ ] Seed script: Super Admin + demo organization
- [ ] Unit/integration tests: login, tenant isolation, RBAC

## Notes on scope realism
This is a genuinely large, multi-quarter product (50 functional areas). Each
milestone above ships real, persisted, tested functionality rather than
scaffolding — so later milestones (Construction, Property/Rental, Facility,
SaaS billing) will each take substantial follow-on sessions. The foundation in
Milestone 1 is built so every later module plugs in without rework: tenant
isolation, permission checks, audit logging, validation pipeline, and API/DTO
conventions are established once and reused everywhere.
