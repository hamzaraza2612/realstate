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
  `5200` Construction Expenses added in Milestone 6, `4100` Rental Revenue added in Milestone 7, and
  `4200` Facility Revenue added in Milestone 8) are seeded once per tenant, at tenant creation — see
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

## Milestone 8 schema (Facility Management, Shopping Mall & Coworking)
Shared foundation:
- `facilities`: id, tenant_id, code (unique per tenant), property_id (FK to `properties`, restrict),
  type, name, status, description, address_line, city, manager_user_id (no FK — AppUser lives in
  Infrastructure)
- `spaces`: id, tenant_id, facility_id (FK, restrict), property_unit_id (FK to `property_units`,
  restrict, nullable — the reuse bridge: set when a space corresponds to a real leasable PropertyUnit,
  e.g. a mall shop; null for a generic internal space like a parking area or coworking zone),
  building_block, code (unique per facility), type, area_size, capacity, status, rate, metadata_json;
  status transitions enforced in the application layer (`SpaceStatusRules`) — `Occupied` is only ever
  set by the owning workflow (a mall lease activation via the extended `LeaseService`), never a direct
  manual transition
- `utility_readings`: id, tenant_id, facility_id (FK, restrict, nullable), property_id (FK, restrict,
  nullable — **`CK_utility_readings_facility_or_property` CHECK** requires at least one), type,
  meter_reference, reading_value, reading_date, consumption, rate_per_unit, amount, paid_amount;
  consumption/amount are computed once at reading time from the previous reading for the same meter,
  never recomputed later — the application layer rejects a reading lower than the previous one
- `facility_service_requests`: id, tenant_id, request_number (unique per tenant, `SR-000001`...),
  facility_id (FK, restrict), space_id (FK, restrict, nullable), requested_by_user_id, requester_customer_id
  (FK to `customers`, restrict, nullable), category, priority (reuses `Property.MaintenancePriority`),
  description, reported_date, assigned_to_user_id, assigned_vendor_id (FK to `vendors`, restrict,
  nullable), status (reuses `Property.MaintenanceStatus`), resolution_notes, resolved_date
- `facility_payments`: id, tenant_id, receipt_number (unique per tenant, `FAC-000001`...), source_type
  (ServiceCharge/Parking/CoworkingMembership/CoworkingBooking/Utility), source_id, amount, payment_date,
  method (reuses `Sales.PaymentMethod`), reference_number, notes, recorded_by_user_id, idempotency_key
  (unique per tenant, nullable) — one shared payment ledger across every facility billing subtype
  instead of five near-duplicate tables

`maintenance_requests` (from Milestone 7) gained two nullable columns, additively: `facility_id` (FK to
`facilities`, restrict) and `space_id` (FK to `spaces`, restrict), plus `sla_hours`/`sla_due_at` — Facility
Management reuses this table for facility/space-level maintenance rather than a parallel entity;
`property_id` remains required and is derived from `Facility.PropertyId` when a request is raised
against a facility, so every pre-existing property-only query keeps working unchanged.

Mall specialization:
- `mall_shop_profiles`: id, tenant_id, space_id (FK, cascade, unique — one profile per shop Space),
  trade_category, storefront_name, notes — the only mall-specific fields; shop leasing itself is the
  unmodified `leases` table (see below)
- `service_charge_definitions`: id, tenant_id, facility_id (FK, restrict), name, calculation_type
  (FixedAmount/PerAreaUnit), amount, billing_frequency (reuses `Property.LeasePaymentFrequency`), is_active
- `service_charge_charges`: id, tenant_id, service_charge_definition_id (FK, restrict), lease_id (FK to
  `leases`, restrict), period_start, period_end, due_date, amount, paid_amount, status — amount is always
  computed deterministically from the definition (FixedAmount, or PerAreaUnit × the leased PropertyUnit's
  area) at generation time, never entered by hand
- `parking_spaces`: id, tenant_id, facility_id (FK, restrict), code (unique per facility), status
- `parking_allocations`: id, tenant_id, parking_space_id (FK, restrict), rental_tenant_id (FK, restrict,
  nullable), vehicle_reference, start_date, end_date, amount, paid_amount, status, notes; a **partial
  unique index on parking_space_id (`WHERE "Status" = 0`, i.e. Active)** allows only one active
  allocation per space at a time
- `facility_events`: id, tenant_id, facility_id (FK, restrict), title, start_at, end_at, location,
  organizer, status, notes
- `tenant_notices`: id, tenant_id, facility_id (FK, restrict), rental_tenant_id (FK, restrict, nullable
  — a facility-wide notice when absent), subject, content, notice_date, status

**A mall shop's lease is the existing `leases` table, completely unmodified** — `Lease.UnitId` points at
the shop's `PropertyUnit` exactly as any other lease would. `LeaseService.ChangeStatusAsync` (Property
module) was extended additively: when it flips a `PropertyUnit`'s occupancy on lease activation/
termination, it now also looks up any `Space` with a matching `PropertyUnitId` and syncs that Space's
status the same way, so a mall shop's Space and PropertyUnit never drift apart — without duplicating any
lease/occupancy logic inside the Facility module.

Coworking specialization:
- `coworking_members`: id, tenant_id, customer_id (FK to `customers`, restrict, unique per tenant),
  is_active, notes — mirrors `rental_tenants`' design exactly (an overlay on the existing Customer)
- `membership_plans`: id, tenant_id, facility_id (FK, restrict), name, duration_days, price,
  included_hours_credits, is_active
- `memberships`: id, tenant_id, member_id (FK to `coworking_members`, restrict), plan_id (FK, restrict),
  start_date, end_date, status (Active/Expired/Cancelled, both terminal — no reactivation), amount
  (snapshotted from the plan at creation), paid_amount
- `desks`: id, tenant_id, space_id (FK to `spaces`, restrict), code (unique per space), type, status
- `meeting_rooms`: id, tenant_id, space_id (FK, restrict), name, capacity, hourly_rate, daily_rate,
  status (Available/Maintenance/Inactive only — occupancy is time-slot based via bookings, not a
  permanent flag)
- `coworking_bookings`: id, tenant_id, member_id (FK to `coworking_members`, restrict), resource_type
  (Desk/MeetingRoom), resource_id, start_at, end_at, status, price (always server-computed from the
  resource's rate × duration), paid_amount, notes; **`CK_coworking_bookings_valid_range` CHECK**
  (`end_at > start_at`) plus a genuine Postgres **range-EXCLUDE constraint**
  (`EX_coworking_bookings_no_overlap`, `EXCLUDE USING gist` over tenant/resource_type/resource_id and a
  `tstzrange(start_at, end_at)`, requiring the `btree_gist` extension enabled in this milestone's
  migration) scoped to non-cancelled bookings — the DB-level half of "no overlapping bookings"; a plain
  unique index can't express a continuous-time-range overlap, so this is a true exclusion constraint,
  not just a unique index, backed by an application-level pre-check for a friendly error message

### Accounting mapping: Facility revenue (service charges, parking, coworking memberships/bookings, utilities)
Each `FacilityPayment`, regardless of billing subtype, posts one journal entry in the same transaction
it's recorded in (see `IFacilityFinancePostingService`, implemented by `FacilityFinancePostingService`,
called from `FacilityPaymentService` before its `SaveChangesAsync`): Dr **Cash and Bank** (1000), Cr
**Facility Revenue** (4200), for the payment amount — cash-basis recognition, the same convention as
Sales/Rental posting. The journal entry's `ReferenceType` is tagged per subtype (`FacilityServiceCharge`,
`FacilityParking`, `FacilityCoworkingMembership`, `FacilityCoworkingBooking`, `FacilityUtility`) so every
posting stays traceable to its source record; duplicate-posting protection reuses the existing
(TenantId, ReferenceType, ReferenceId) unique index on `journal_entries` from Milestone 5 — no new
constraint needed for any of the five subtypes.

## Milestone 9 schema fix (role-name uniqueness)
`roles.NormalizedName` carried ASP.NET Core Identity's own default **global** unique index
(`RoleNameIndex`), which meant no two tenants could ever create a custom role with the same name — the
very first tenant to name a role "Manager" would permanently block every other tenant from doing the
same. Migration `FixRoleNameUniquePerTenant` makes `RoleNameIndex` non-unique and makes the existing
`(tenant_id, normalized_name)` index the real unique constraint instead — role names are now unique per
tenant, not platform-wide, which is correct multi-tenant behavior (system roles, `tenant_id IS NULL`,
remain shared by name across all tenants, unaffected by this change since there's still only one row per
system role name).

## Milestone 10 schema (Security & Finance Hardening)
- `fiscal_periods`: id, tenant_id, name, start_date, end_date, status (Open/Closed), closed_at,
  closed_by_user_id; a genuine Postgres **range-EXCLUDE constraint**
  (`EX_fiscal_periods_no_overlap`, `EXCLUDE USING gist` over tenant_id and
  `daterange(start_date, end_date, '[]')`, reusing the `btree_gist` extension enabled in Milestone 8) —
  no two periods for the same tenant may ever overlap, enforced at the database level, not just in
  application code. Periods are opt-in: a journal entry dated outside every defined period for its
  tenant is always allowed through — a tenant that never creates one sees no behavior change.
- `journal_entries` gained two nullable/default columns, additively: `is_reversed` (bool, default false)
  and `reversal_of_entry_id` (self-FK, restrict). A reversal entry reuses the existing
  `(tenant_id, reference_type, reference_id)` unique index from Milestone 5 with `reference_type =
  "Reversal"` and `reference_id` = the original entry's id — the same index that caps a source event at
  one journal entry now also caps an original entry at one reversal, with no new constraint needed.
- `expenses` gained one additive column: `paid_amount` (numeric(18,2), default 0) — the running total of
  `expense_payments` recorded against it, mirroring how `RentSchedule.PaidAmount` and
  `ServiceChargeCharge.PaidAmount` already track payments against their own obligation rows elsewhere in
  the schema.
- `expense_payments`: id, tenant_id, receipt_number (unique per tenant, `EXP-PMT-000001`...), expense_id
  (FK to `expenses`, restrict), amount, payment_date, reference_number, notes, recorded_by_user_id,
  idempotency_key (unique per tenant, nullable), journal_entry_id — mirrors the `rent_payments`/
  `facility_payments` source-row-per-posting pattern exactly, since one Expense can be paid across
  several installments and each needs its own row for the duplicate-posting index above to work.

**Fiscal-period enforcement** is centralized in one static helper (`FiscalPeriodGuard.IsClosedAsync`),
called from all five journal-entry-creation paths — `JournalService.CreateAsync` (manual entries) and
all four system posting services (`SalesPaymentPostingService`, `RentalPaymentPostingService`,
`FacilityFinancePostingService`, `ConstructionFinancePostingService`, the last of which also gained the
new `PostExpensePaymentAsync` method for AP clearing below) — so "don't post into a closed period" can
never drift out of sync between them.

### Accounting mapping: AP clearing (vendor payments)
Each `ExpensePayment` posts one journal entry in the same transaction it's recorded in (see
`IConstructionFinancePostingService.PostExpensePaymentAsync`, called from `ExpenseService.PayAsync`
before its `SaveChangesAsync`): Dr **Accounts Payable** (2200), Cr **Cash and Bank** (1000), for the
payment amount — the reverse of the Dr Expense / Cr AP posting Milestone 6 made at expense approval, so
approving then fully paying an expense nets Accounts Payable back to zero for that expense. Overpayment
beyond the expense's outstanding balance (`amount - paid_amount`) is rejected the same way
`RentPaymentService` already rejects overpayment against a rent schedule line.

### Accounting mapping: journal reversal
`JournalService.ReverseAsync` posts a new entry with every line's debit and credit swapped relative to
the original, dated either today or an explicitly supplied reversal date (also checked against
`FiscalPeriodGuard`), and marks the original `is_reversed = true`. The original is never edited or
deleted — reversal is purely additive, preserving full auditability of what was originally posted and
when it was corrected.

## Milestone 11 schema (Documents + Notifications + Approvals + Communication Foundation)
- `documents`: id, tenant_id, entity_type (a string constant, e.g. `"Customer"` — not an FK; see
  `DocumentEntityTypes`), entity_id, category, title, description, latest_version_number,
  created_by_user_id; indexed on `(tenant_id, entity_type, entity_id)` — the lookup every "attachment
  list" view uses — and on `(tenant_id, category)`. No FK from `entity_id` to any specific table, by
  design: a polymorphic reference lets any module attach documents without a per-module document table
  or join table, at the cost of the database not being able to enforce the referenced row still exists —
  tenant isolation is still guaranteed because `documents` is itself tenant-scoped, independent of what
  it's attached to.
- `document_versions`: id, tenant_id, document_id (FK, cascade), version_number, storage_key,
  original_file_name, content_type, size_bytes, sha256_hash, uploaded_by_user_id; unique on
  `(tenant_id, document_id, version_number)`. `storage_key` is an opaque, service-generated
  `{tenant_id}/{new Guid}` string — never derived from `original_file_name` — resolved only by
  `IFileStorageService`, never exposed to a client or interpreted as a filesystem path anywhere outside
  that one service.
- `notifications`: id, tenant_id, user_id, category, title, body, entity_type (nullable, for a deep
  link), entity_id (nullable), is_read, read_at; indexed on `(tenant_id, user_id, created_at)` and
  `(tenant_id, user_id, is_read)` — the two access patterns ("my recent notifications", "my unread
  list/count").
- `notification_preferences`: id, tenant_id, user_id, category, in_app_enabled, email_enabled; unique on
  `(tenant_id, user_id, category)`. A missing row for a (user, category) pair means both channels default
  to enabled — most users never touch this table at all.
- `communication_logs`: id, tenant_id, channel, recipient_user_id, recipient_address, subject, body,
  status (Sent/Failed/Skipped), error_message, entity_type, entity_id; indexed on
  `(tenant_id, recipient_user_id)` and `(tenant_id, created_at)`. Every `ICommunicationService.SendAsync`
  call writes one row per channel actually attempted, regardless of outcome — durable communication
  history even though the registered Email channel is a development-safe logging provider, not a real
  mail transport, in this deployment.
- `approval_requests`: id, tenant_id, entity_type, entity_id, requested_by_user_id, approver_user_id
  (nullable), required_permission (nullable — exactly one of the two is expected to be set), request_
  comments, status (Pending/Approved/Rejected/Cancelled), decision_comments, decided_by_user_id,
  decided_at; indexed on `(tenant_id, entity_type, entity_id)`, `(tenant_id, approver_user_id, status)`,
  and `(tenant_id, status)`. Uses **Postgres's built-in `xmin` system column as an EF Core optimistic-
  concurrency token** (`UseXminAsConcurrencyToken()`, no extra column needed) — the first real
  concurrency token anywhere in this domain model (see `PRODUCT_GAP_AUDIT.md`'s technical debt
  register). Two approvers deciding the same request in the same instant race on `SaveChanges`; the
  loser gets `DbUpdateConcurrencyException`, mapped to the same `already_decided` outcome a sequential
  race would have produced, instead of silently overwriting the winner's decision.

### Storage configuration and production deployment requirements
`Storage:LocalPath` (default `./data/uploads`, already provisioned as a Docker volume in
`docker-compose.yml` since Milestone 1) is where `LocalFileStorageService` writes files, one
subdirectory per tenant. `Storage:MaxFileSizeMb` (default 25) and `Storage:AllowedContentTypes` (an
explicit allow-list — PDF, PNG/JPEG/WebP, plain text/CSV, the three Office Open XML formats, and plain
zip) are both configurable in `appsettings.json` without a code change. **Production requirement**: the
`uploads-data` Docker volume must be included in any backup strategy — document files live only on that
volume, never in PostgreSQL, so a database-only backup loses every uploaded file's content (the
`document_versions` rows would still reference storage keys that no longer resolve to anything). Running
more than one API replica requires either a shared volume mounted at the same `Storage:LocalPath` on
every replica, or swapping `IFileStorageService`'s registration for an S3/Azure Blob implementation
(the interface is already provider-agnostic for exactly this reason) — `LocalFileStorageService` alone
does not support horizontal scaling across replicas with independent local disks.

## Milestone 12 schema — Reporting & Analytics

No new tables: the reporting layer is a pure read/query layer over existing tables (plus, for a
handful of reports, direct calls into another module's own already-implemented service — see
`docs/REPORTING.md`). One migration, `AddReportingIndexes`, adds composite indexes justified by the
new report queries' actual filter predicates — nothing speculative:

| Table | New index | Report(s) it serves |
|---|---|---|
| `bookings` | `(tenant_id, status, booking_date)` | Sales by-period/-project/-agent, Executive Dashboard Sales KPI — all filter Confirmed bookings by date range |
| `payments` | `(tenant_id, payment_date)` | Sales collections/receivable reports, Executive Dashboard Collections KPI, collections-trend |
| `expenses` | `(tenant_id, status, expense_date)` | AP aging, expense-trend, budget-vs-actual — all filter Approved expenses by date range |
| `rent_payments` | `(tenant_id, payment_date)` | Property rent-collected/revenue, collections-trend |
| `purchase_orders` | `(tenant_id, order_date)` | Vendor-spend (filters by date across every status, so the existing `(tenant_id, status)` index alone doesn't cover it) |
| `facility_payments` | `(tenant_id, payment_date)` | Facility revenue, Executive Dashboard Collections KPI |
| `service_charge_charges` | `(tenant_id, due_date)` | Service-charge-collection |
| `maintenance_requests` | `(tenant_id, facility_id)` | Facility maintenance-backlog (scopes the shared Property/Facility table down to Facility-linked rows) |

Applied and schema-verified against the dev database (`psql \d <table>` confirms each index).

## Milestone 13 schema — External Portal Foundation

One migration, `AddExternalPortalFoundation`. Full architectural rationale (why a separate table
from `AppUser`, the JWT claim scheme) is in `docs/PORTAL_ARCHITECTURE.md`.

**`portal_users`** — one row per external-actor login. `TenantEntity` (has `TenantId` and the EF
global tenant filter, unlike the two token tables below which are looked up by opaque hash and
therefore don't need it).

| Column | Notes |
|---|---|
| `Email`, `NormalizedEmail` | `NormalizedEmail` is upper-invariant; unique per `(TenantId, NormalizedEmail)` — **not** globally unique, unlike `AppUser`/Identity's `NormalizedUserName`, so the same email can hold a portal account at multiple tenants. |
| `PasswordHash` | `PasswordHasher<PortalUser>` (ASP.NET Core Identity's hasher class used standalone, no `UserManager`). |
| `ActorType`, `ActorId` | One of `Customer`/`RentalTenant`/`PropertyOwner`/`Vendor`/`CoworkingMember`; unique per `(TenantId, ActorType, ActorId)` — one portal login per actor. |
| `IsActive`, `EmailConfirmed` | `EmailConfirmed` exists for a future verification flow; nothing sets it `true` yet outside test setup. |
| `AccessFailedCount`, `LockedOutUntil` | Manual lockout (5 attempts / 15 minutes) — `PortalUser` has no Identity `UserManager` lockout machinery to reuse. |
| `LastLoginAt` | Set on successful login. |

Indexes: `IX_portal_users_TenantId_NormalizedEmail` (unique), `IX_portal_users_TenantId_ActorType_ActorId` (unique).

**`portal_refresh_tokens`** and **`portal_password_reset_tokens`** — plain classes (not
`TenantEntity`; looked up by `TokenHash`, same shape as the existing internal `RefreshToken` table).

| Table | Columns | Notes |
|---|---|---|
| `portal_refresh_tokens` | `PortalUserId`, `TokenHash` (unique), `ExpiresAt`, `CreatedAt`, `CreatedByIp`, `RevokedAt`, `ReplacedByTokenHash` | Same rotation-with-audit-trail pattern as internal `refresh_tokens`. |
| `portal_password_reset_tokens` | `PortalUserId`, `TokenHash` (unique), `ExpiresAt`, `CreatedAt`, `UsedAt` | One token type serves both account activation (issued on invite) and ordinary forgot-password. |

**`property_owners`** — new first-class entity (`Property.OwnerName`/`OwnerContact` were, and
remain, free-text-only fields; this milestone needed a real, linkable owner row for the Owner
Portal).

| Column | Notes |
|---|---|
| `FullName`, `Email`, `Phone`, `Notes` | |
| `IsActive` | |

Index: `IX_property_owners_TenantId_IsActive`.

**`properties.PropertyOwnerId`** (nullable `uuid`, `ON DELETE SET NULL`) — added to the existing
`properties` table. One owner can own many properties; a property has **at most one** linked owner
in this milestone (not a co-ownership model). Indexes: `IX_properties_PropertyOwnerId`,
`IX_properties_TenantId_PropertyOwnerId`.

Applied and schema-verified against the dev database (`psql \d portal_users`,
`\d portal_refresh_tokens`, `\d portal_password_reset_tokens`, `\d property_owners`, `\d properties`
all confirm the expected columns/indexes/FK).

## Milestone 14 schema — SaaS Control Plane & Billing

One migration, `AddSaasControlPlane`. Full architectural rationale is in `docs/SAAS_BILLING.md`.

**`subscription_plans`** (existing table, extended) — dropped `UserLimit`/`ProjectLimit`/
`StorageLimitMb` (replaced by `plan_entitlements` rows) and the `plan_features` relationship;
added `Code` (unique), `Description`, `DisplayOrder`, `TrialDays`, `Currency`, `SetupPrice`,
`MetadataJson`. `plan_features`/`tenant_feature_entitlements` tables **dropped** — confirmed
zero rows in any seeded/dev data before dropping (nothing in the codebase ever wrote to them).
Indexes: `IX_subscription_plans_Code` (unique), `IX_subscription_plans_IsActive_DisplayOrder`.

**`plan_entitlements`** — a plan's default grant per entitlement code.

| Column | Notes |
|---|---|
| `SubscriptionPlanId` | FK → `subscription_plans`, `ON DELETE CASCADE` |
| `Code` | e.g. `"external_portals"`, `"max_users"` — a compile-time catalog (`EntitlementCodes`), not a DB table |
| `BoolValue`, `NumericValue` | exactly one meaningful per the code's type (Feature/Limit) |

Index: `IX_plan_entitlements_SubscriptionPlanId_Code` (unique).

**`tenant_entitlement_overrides`** — per-tenant override, same shape as `plan_entitlements` plus
`TenantId`. Index: `IX_tenant_entitlement_overrides_TenantId_Code` (unique).

**`subscriptions`** — one row per tenant subscription period.

| Column | Notes |
|---|---|
| `PlanId` | not a DB foreign key (plans can be deactivated, never deleted, so no FK needed) |
| `Status` | `SubscriptionStatus` enum (Trialing/Active/PastDue/Paused/Cancelled/Expired) |
| `TrialStartsAt`/`TrialEndsAt`, `CurrentPeriodStart`/`CurrentPeriodEnd`, `CancelAtPeriodEnd`, `CancelledAt` | lifecycle timestamps |
| `Currency`, `PriceSnapshot`, `BillingCycle` | snapshotted at subscribe/renew time, independent of the plan's current values |
| `ExternalProvider`, `ExternalCustomerId`, `ExternalSubscriptionId` | nullable, unpopulated extension fields for a future payment provider |
| `xmin` (Postgres system column) | optimistic-concurrency token via `IsRowVersion()` — same mechanism `ApprovalRequest` uses |

Indexes: `IX_subscriptions_PlanId`, `IX_subscriptions_Status`, and
`IX_subscriptions_TenantId_NonTerminal_Unique` — a **filtered partial-unique index** on `TenantId`
`WHERE "Status" IN (0,1,2,3)` (Trialing/Active/PastDue/Paused), so a tenant can have at most one
non-terminal subscription while `Cancelled`/`Expired` rows stay as unlimited history — the same
filtered-partial-unique-index technique already used elsewhere in this schema to prevent
overlapping leases/bookings.

**`invoices`** / **`invoice_line_items`** — one invoice per billing period.

| Column | Notes |
|---|---|
| `InvoiceNumber` | tenant-scoped format `INV-000001`, **not** globally unique — same convention as `BookingNumber`/`LeaseNumber` |
| `SubscriptionId` | not a DB foreign key (same rationale as `subscriptions.PlanId`) |
| `Subtotal`/`TaxAmount`/`Total`, `Currency`, `Status`, `IssuedDate`/`DueDate`/`PaidDate` | |
| `ExternalProviderReference` | nullable, unpopulated extension field |

Indexes: `IX_invoices_TenantId_InvoiceNumber` (unique, tenant-scoped — **not** a global unique
index, per this milestone's explicit instruction to avoid that for tenant-owned identifiers),
`IX_invoices_SubscriptionId`, `IX_invoices_TenantId_Status`, `IX_invoices_DueDate`.
`invoice_line_items.InvoiceId` → `invoices.Id`, `ON DELETE CASCADE`.

**`billing_payments`** — a recorded payment against an invoice.

| Column | Notes |
|---|---|
| `InvoiceId` | not a DB foreign key |
| `Amount`, `Currency`, `Status`, `PaymentDate` | |
| `Provider` | `"manual"` for this milestone's only path (a platform admin recording a received payment) |
| `ProviderTransactionId` | nullable extension field |
| `IdempotencyKey` | unique per `(TenantId, IdempotencyKey)` — same pattern as `payments`/`rent_payments`/`facility_payments` |
| `FailureReason` | nullable |

Index: `IX_billing_payments_TenantId_IdempotencyKey` (unique), `IX_billing_payments_InvoiceId`.

Applied and schema-verified against both the dev and integration-test databases (`psql \d
subscriptions`, `\d invoices`, `\d billing_payments`, `\d plan_entitlements`,
`\d tenant_entitlement_overrides` all confirm the expected columns/indexes).

Later milestones extend this file per-module (
Subscription) as they land — each new module's tables and
relationships are appended here in the same milestone's PR/commit that adds
the migration.
