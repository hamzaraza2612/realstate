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

## Milestone 4 schema (Sales Booking & Payment Plans)
- `bookings`: id, tenant_id, booking_number (unique per tenant), customer_id (FK, restrict), project_id
  (FK, restrict), inventory_unit_id (FK, restrict), sales_agent_user_id (no FK — AppUser lives in
  Infrastructure), booking_date, status, total_price, discount, net_price, notes; a **partial unique
  index on inventory_unit_id (`WHERE status <> Cancelled`)** is the actual double-booking guard, not
  application logic
- `payment_plans`: id, tenant_id, booking_id (FK, cascade, unique — one plan per booking), name,
  booking_amount, down_payment, plan_type, frequency, number_of_installments, grace_period_days
- `installments`: id, tenant_id, booking_id (FK, cascade), payment_plan_id (FK, cascade), installment_number
  (unique per plan), label, due_date, amount, paid_amount, status, payment_date, notes; "Overdue" is
  never written here — it's computed from due_date + grace period at read time
- `payments`: id, tenant_id, receipt_number (unique per tenant), booking_id (FK, restrict), installment_id
  (FK, restrict — payments are a financial record and must never cascade-delete), amount, payment_date,
  method, reference_number, notes, recorded_by_user_id, idempotency_key (unique per tenant, nullable —
  added in Milestone 5 so a retried payment request returns the original payment instead of duplicating it)

## Milestone 5 schema (Finance & Accounting Foundation)
- `accounts`: id, tenant_id, code (unique per tenant), name, type (Asset/Liability/Equity/Revenue/Expense),
  parent_account_id (self-FK, restrict), is_active, is_system; the system accounts a tenant needs for
  operational posting (`1000` Cash and Bank, `4000` Sales Revenue, `2200` Accounts Payable and
  `5200` Construction Expenses added in Milestone 6, and `4100` Rental Revenue added in Milestone 7) are
  seeded once per tenant, at tenant creation — see
  `SystemAccountSeeder`, called from `OrganizationService` and `DemoDataSeeder`, not from the global
  `DbSeeder` (accounts are tenant-owned, not a platform-wide catalog); `SystemAccountSeeder` loops a
  table of (code, name, type) and adds only what's missing, so it also backfills new system accounts for
  pre-existing tenants (e.g. the demo tenant) the next time it runs
- `journal_entries`: id, tenant_id, entry_number (unique per tenant), entry_date, description,
  reference_type (default `"Manual"`), reference_id, status (Draft/Posted/Cancelled); a unique index on
  (tenant_id, reference_type, reference_id) where reference_id is not null caps a source event (e.g. one
  Sales Payment) at exactly one journal entry — the database-level half of duplicate-posting protection
- `journal_lines`: id, tenant_id, journal_entry_id (FK, cascade), account_id (FK, restrict), debit, credit,
  description; a check constraint requires exactly one of debit/credit to be positive and the other zero
- `financial_documents`: id, tenant_id, document_number (unique per tenant), type
  (Invoice/Receipt/CreditNote/DebitNote), status, customer_id (no FK — deliberately generic so future
  modules can attach other party types), amount, issue_date, reference_type, reference_id, journal_entry_id,
  notes — a reusable document shell, not a full invoicing/tax engine

### Accounting mapping: Sales payments
Each Sales `Payment` posts one journal entry in the same transaction it's recorded in (see
`ISalesPaymentPostingService`, called from Sales' `PaymentService` before its `SaveChangesAsync`):
Dr **Cash and Bank** (1000), Cr **Sales Revenue** (4000), for the payment amount. This is cash-basis
recognition — revenue is recognized when cash is received, not when the booking is confirmed — a
deliberate scope reduction for this foundation milestone (no accrual-basis AR recognition at booking
time yet). The Sales installment schedule itself remains the operational AR sub-ledger (surfaced via
`GET /api/v1/finance/receivables`); accrual revenue recognition tied to booking confirmation is left to a
future accounting milestone.

## Milestone 6 schema (Construction & Procurement)
- `work_packages`: id, tenant_id, project_id (FK, restrict), name, code (unique per project),
  description, planned/actual start/end date, status, progress_percent, manager_user_id (no FK — AppUser
  lives in Infrastructure), budget
- `construction_tasks`: id, tenant_id, work_package_id (FK, restrict), title, description,
  assigned_to_user_id, priority, planned/actual start/end date, status, progress_percent,
  depends_on_task_id (self-FK, restrict — single-predecessor dependency foundation, not a full DAG)
- `vendors`: id, tenant_id, name, contact_person, email, phone, address, tax_registration_number,
  is_active, notes — a standalone procurement-side profile, deliberately separate from `customers`
- `purchase_requests`: id, tenant_id, request_number (unique per tenant, `PR-000001`...), project_id (FK,
  restrict), work_package_id (FK, restrict, nullable), requested_by_user_id, required_date, priority,
  status, notes
- `purchase_request_lines`: id, tenant_id, purchase_request_id (FK, cascade), material_id (FK, restrict,
  nullable), item_description, unit_of_measure, quantity, estimated_unit_price, estimated_total
- `purchase_orders`: id, tenant_id, po_number (unique per tenant, `PO-000001`...), vendor_id (FK,
  restrict), project_id (FK, restrict), work_package_id (FK, restrict, nullable), purchase_request_id
  (FK, restrict, nullable), order_date, expected_delivery_date, status, subtotal, discount, tax_amount,
  total, notes — subtotal/total are server-computed, never accepted from the client
- `purchase_order_lines`: id, tenant_id, purchase_order_id (FK, cascade), material_id (FK, restrict,
  nullable), item_description, unit_of_measure, quantity, unit_price, total, received_quantity (running
  total updated by receipts); **`CK_purchase_order_lines_received_not_exceed_ordered` CHECK
  (`received_quantity <= quantity`)** — the DB-level half of over-receiving protection, backing up the
  application-level pre-check for the race-condition case
- `material_receipts`: id, tenant_id, receipt_number (unique per tenant, `GRN-000001`...),
  purchase_order_id (FK, restrict), vendor_id (FK, restrict), received_date, received_by_user_id, notes
- `material_receipt_lines`: id, tenant_id, material_receipt_id (FK, cascade), purchase_order_line_id (FK,
  restrict), received_quantity
- `materials`: id, tenant_id, sku (unique per tenant), name, unit_of_measure, category, current_quantity,
  minimum_quantity, is_active — a construction-materials catalog, kept entirely separate from
  `inventory_units` (real-estate plot/unit inventory); the two are never mixed
- `stock_movements`: id, tenant_id, material_id (FK, restrict), type (Receipt/Issue/Adjustment), quantity
  (signed regardless of type), reference_type, reference_id, notes — a receipt auto-creates one of these
  per received line; manual Issue/Adjustment movements go through the same table for a single audit trail
- `expenses`: id, tenant_id, project_id (FK, restrict), work_package_id (FK, restrict, nullable),
  category, amount, expense_date, vendor_id (FK, restrict, nullable), reference_number, notes, status,
  created_by_user_id, journal_entry_id (nullable — set only once Approved)

### Accounting mapping: Construction expenses
Approving a construction `Expense` posts one journal entry in the same transaction as the approval (see
`IConstructionFinancePostingService`, implemented by `ConstructionFinancePostingService`, called from
Construction's `ExpenseService` before its `SaveChangesAsync`): Dr **Construction Expenses** (5200), Cr
**Accounts Payable** (2200), for the expense amount. This is accrual recognition — the obligation to pay
the vendor is recognized on approval, not on actual cash payment — which is the mirror image of Milestone
5's cash-basis Sales posting; reconciling the vendor payable against an actual cash disbursement is left
to a future accounts-payable/payment milestone. Rejecting an expense posts no journal entry at all.

## Milestone 7 schema (Property & Rental Management)
- `properties`: id, tenant_id, code (unique per tenant), name, type, status, description, address_line,
  city, state, country, postal_code, owner_name, owner_contact — kept separate from `projects`
- `property_units`: id, tenant_id, property_id (FK, restrict), building_block (free text), unit_number
  (unique per property), type, floor, area_size, area_unit (free text), bedrooms, status, market_rent_rate,
  metadata_json — kept entirely separate from `inventory_units` (sales inventory); status transitions are
  enforced in the application layer (`PropertyUnitStatusRules`), and `Occupied` specifically is only ever
  set by `LeaseService` on activation/termination, never a direct manual transition
- `rental_tenants`: id, tenant_id, customer_id (FK to `customers`, restrict, unique per tenant — one
  rental-tenant overlay per Customer), is_company, identification_number, is_active, notes — name/email/
  phone/address live on `customers`, not duplicated here
- `leases`: id, tenant_id, lease_number (unique per tenant), property_id (FK, restrict), unit_id (FK,
  restrict), rental_tenant_id (FK, restrict), start_date, end_date, rent_amount, security_deposit,
  payment_frequency, grace_period_days, status, terms, notes; a **partial unique index on unit_id
  (`WHERE "Status" < 3`, i.e. Draft/PendingApproval/Active)** is the actual conflicting-lease guard, not
  application logic — mirrors Sales' double-booking partial unique index exactly
- `rent_schedules`: id, tenant_id, lease_id (FK, cascade), period_number (unique per lease), period_start,
  period_end, due_date, amount, paid_amount, status; generated once, deterministically, when a lease
  becomes Active — "Overdue" is never written here, it's computed at read time from due_date + the
  lease's grace_period_days vs. today, exactly like Sales' `InstallmentStatus`
- `rent_payments`: id, tenant_id, receipt_number (unique per tenant, `RNT-000001`...), lease_id (FK,
  restrict), rent_schedule_id (FK, restrict), amount, payment_date, method (reuses `Sales.PaymentMethod`),
  reference_number, notes, recorded_by_user_id, idempotency_key (unique per tenant, nullable)
- `security_deposits`: id, tenant_id, lease_id (FK, cascade, unique — one deposit per lease), amount,
  received_date, status, refunded_amount, refund_date, notes — auto-created at lease creation when the
  lease's security_deposit amount is greater than zero
- `maintenance_requests`: id, tenant_id, request_number (unique per tenant, `MR-000001`...), property_id
  (FK, restrict), unit_id (FK, restrict, nullable), rental_tenant_id (FK, restrict, nullable), category,
  priority, description, reported_date, assigned_to_user_id (no FK — AppUser lives in Infrastructure),
  assigned_vendor_id (FK to the existing `vendors` table, restrict — no second vendor concept), status,
  resolution_notes, completion_date

### Accounting mapping: Rental payments
Each rent `RentPayment` posts one journal entry in the same transaction it's recorded in (see
`IRentalPaymentPostingService`, implemented by `RentalPaymentPostingService`, called from Property's
`RentPaymentService` before its `SaveChangesAsync`): Dr **Cash and Bank** (1000), Cr **Rental Revenue**
(4100), for the payment amount — cash-basis recognition, the same convention as Milestone 5's Sales
posting. Duplicate-posting protection reuses the existing (TenantId, ReferenceType, ReferenceId) unique
index on `journal_entries` from Milestone 5 (ReferenceType `"RentalPayment"`) — no new constraint needed.

Later milestones extend this file per-module (
Facility, Documents, Subscription) as they land — each new module's tables and
relationships are appended here in the same milestone's PR/commit that adds
the migration.
