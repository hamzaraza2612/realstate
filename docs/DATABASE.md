# Database

PostgreSQL. EF Core Code-First migrations (`backend/src/Infrastructure/Migrations`).
Never edit production schema by hand — always via `dotnet ef migrations add`.

## Conventions
- PK: `Id uuid` (`gen_random_uuid()` default via Npgsql `uuid-ossp`/pgcrypto).
- Every tenant-owned table: `tenant_id uuid not null` + FK to `tenants(id)`, indexed.
- Audit columns on every table: `created_at timestamptz`, `created_by uuid null`,
  `updated_at timestamptz null`, `updated_by uuid null`.
- Soft delete: `is_deleted boolean default false` + `deleted_at`, `deleted_by` on
  entities where hard-delete would break referential/audit history (customers,
  bookings, leases, invoices, etc.); EF global query filter excludes deleted rows.
- Naming: snake_case for tables/columns (via EF Core naming convention), PascalCase
  in C#.
- Money: `numeric(18,2)`. Percentages: `numeric(5,2)`.

## Milestone 1 schema (Identity/Tenancy/Administration)
- `tenants` (organizations): id, name, slug (unique), status, subscription_plan_id, timezone, created_at...
- `users` (AspNetCore Identity `AppUser`): id, tenant_id (null for Super Admin/platform users), email, phone, full_name, is_active, ...
- `roles`: id, tenant_id (null = system/global role template), name, description, is_system
- `permissions`: id, code (unique, e.g. `sales.booking.create`), module, description
- `role_permissions`: role_id, permission_id
- `user_roles`: user_id, role_id (Identity default, tenant-scoped via role.tenant_id)
- `refresh_tokens`: id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_token_hash, created_by_ip
- `audit_logs`: id, tenant_id (nullable for platform actions), user_id, action, module, entity_type, entity_id, before_json, after_json, ip_address, created_at
- `subscription_plans`: id, name, price, billing_cycle, user_limit, project_limit, storage_limit_mb, is_active
- `tenant_feature_entitlements`: tenant_id, feature_code, is_enabled

Later milestones extend this file per-module (CRM, Sales/Inventory, Finance,
Construction, Property, Facility, Documents, Subscription) as they land —
each new module's tables and relationships are appended here in the same
milestone's PR/commit that adds the migration.
