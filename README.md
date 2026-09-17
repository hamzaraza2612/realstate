# Estatery ERP

A multi-tenant Real Estate ERP/SaaS platform — CRM, projects & inventory,
sales, finance, construction, property/rental management, facility
management, and platform/subscription administration, built for real estate
developers, builders, property managers, and coworking/mall operators.

This is an original product (no third-party branding), built module by
module. See `docs/ROADMAP.md` for what's shipped and what's next.

## Repository layout
```
backend/    .NET 8 API — Clean Architecture (Api/Application/Domain/Infrastructure/Shared)
frontend/   React 19 + TypeScript + Vite SPA
docs/       Architecture, database, API, roadmap, and deployment docs
infra/      Reverse-proxy Nginx config used by docker-compose.yml
```

## Quick start
```bash
cp .env.example .env   # fill in real secrets
docker compose build
docker compose up -d
```
Or run the backend and frontend directly for local development — see
`docs/DEPLOYMENT.md` for both paths, plus migrations, backups, and health
checks.

## Docs
- `docs/ARCHITECTURE.md` — stack, module layout, multi-tenancy, auth/RBAC, API conventions
- `docs/DATABASE.md` — schema conventions and current tables
- `docs/API.md` — endpoint conventions and the current endpoint list
- `docs/ROADMAP.md` — milestone status
- `docs/DEPLOYMENT.md` — local dev, Docker Compose, migrations, backup/restore

## Status
Milestone 1 (foundation) is complete: multi-tenancy, authentication, RBAC,
organization management, and audit logging are live end-to-end with tests.
See the roadmap for everything still ahead.
