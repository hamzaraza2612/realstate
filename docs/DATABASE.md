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

## Milestone 2 schema (CRM)
- `leads`: id, tenant_id, full_name, email, phone, company_name, source, status, priority, notes, assigned_to_user_id (no FK — AppUser lives in Infrastructure), converted_to_customer_id
- `customers`: id, tenant_id, full_name, email, phone, address, company_name, converted_from_lead_id (unique, nullable — one lead converts to at most one customer)
- `activities`: id, tenant_id, type, subject, description, due_date, status, completed_at, lead_id (FK, cascade), customer_id (FK, cascade), assigned_to_user_id; check constraint requires at least one of lead_id/customer_id

## Milestone 3 schema (Projects + Inventory)
- `projects`: id, tenant_id, name, code (unique per tenant), type, status, description, address_line, city, state, country, postal_code, start_date, end_date, latitude, longitude, geo_json
- `project_nodes`: id, tenant_id, project_id (FK, restrict), parent_node_id (self-FK, restrict — a single
  self-referencing table for Phase/Zone/Block/Building/Floor, so each project only has the levels it
  needs), node_type, name, code (unique per project), sort_order, latitude, longitude, geo_json, metadata_json
- `inventory_units`: id, tenant_id, project_id (FK, restrict), node_id (FK to project_nodes, restrict,
  nullable), code (unique per project), type, status, area_size, area_unit, latitude, longitude,
  geo_json, metadata_json; status transitions are enforced in the application layer
  (`InventoryStatusRules`), not by a DB constraint

Later milestones extend this file per-module (Sales/Inventory bookings, Finance,
Construction, Property, Facility, Documents, Subscription) as they land —
each new module's tables and relationships are appended here in the same
milestone's PR/commit that adds the migration.
