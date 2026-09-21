# Roadmap

Status legend: ✅ done · 🚧 in progress · ⬜ not started

| Milestone | Scope | Status |
|---|---|---|
| 0 | Discovery + docs | ✅ |
| 1 | Foundation: solution structure, DB, tenancy, auth, RBAC, org mgmt, audit log, API conventions, frontend shell | ✅ |
| 2 | CRM: leads, sources, campaigns, pipeline, activities, conversion | ✅ |
| 3 | Projects + Inventory: projects, societies, blocks, units, mapping | ✅ |
| 4 | Sales: bookings, pricing, installments, approvals, payments, receipts | ✅ |
| 5 | Finance: chart of accounts, journals, receivables/payables, reports | ✅ |
| 6 | Construction & Procurement: work packages, tasks, vendors, purchase requests/orders, receiving, materials, expenses | ✅ |
| 7 | Property/Rental: properties, units, tenants, leases, rent schedule/payments, security deposits, maintenance | ✅ |
| 8 | Facility: mall, coworking, facility management | ⬜ |
| 9 | Portals: customer/tenant/member portals | ⬜ |
| 10 | Documents + Notifications + approval workflows | ⬜ |
| 11 | Reporting: dashboards, exports | ⬜ |
| 12 | SaaS: subscriptions, plans, entitlements, super-admin | ⬜ |
| 13 | Production hardening: security, tests, Docker, CI/CD, docs | ⬜ |

## Milestone 1 — Foundation ✅
- [x] Repo/docs scaffold
- [x] Backend solution (`backend/RealEstateErp.sln`) with Api/Application/Domain/Infrastructure/Shared
- [x] PostgreSQL EF Core setup + initial migration
- [x] Tenant model + `ITenantContext` + global query filters (+ explicit Super-Admin-only bypass)
- [x] ASP.NET Core Identity + JWT access/refresh tokens (rotating, hashed at rest)
- [x] Permission-based RBAC (Roles, Permissions, RolePermissions) — 17 system roles seeded per spec
- [x] Organization (tenant) CRUD + Super Admin bootstrap + Subscription Plan CRUD
- [x] Audit logging (automatic diff-based via DbContext + explicit `IAuditLogger` for business events)
- [x] Global error handling middleware + ProblemDetails
- [x] Serilog structured logging
- [x] Swagger/OpenAPI with JWT auth
- [x] IP rate limiting (AspNetCoreRateLimit) — tighter limits on `/auth/login` and `/auth/refresh`
- [x] Frontend shell (Vite+React+TS+Tailwind+Radix "shadcn-style" components): login, dashboard,
      sidebar/topbar/breadcrumbs, dark mode, Users/Roles/Organization/Audit Logs pages, Super Admin
      Platform pages (Organizations, Subscription Plans) — verified in a real browser end-to-end
- [x] Docker Compose (Postgres, Redis, API, Web, reverse-proxy Nginx) + `.env.example` +
      per-service Dockerfiles — API image built and run end-to-end against real Postgres in this
      session; full `docker compose up` could not be exercised here because this sandbox's network
      policy blocks Docker Hub image pulls (see `docs/DEPLOYMENT.md`)
- [x] Seed script: Super Admin + demo organization (`acme-builders`) with demo users per role
- [x] Unit/integration tests: 12 unit + 13 integration (real Postgres, real HTTP pipeline) covering
      login, refresh rotation, tenant isolation, and RBAC enforcement — all passing

## Milestone 2 — CRM ✅
- [x] Leads: source/status/priority, assignment, notes, tenant-scoped CRUD
- [x] Customers: profile, address, conversion link back to originating lead
- [x] Activities: calls/meetings/notes/follow-ups, due dates, completion, linked to a lead or customer
- [x] Lead → Customer conversion (transactional, one-way, guarded against double-conversion)
- [x] CRM dashboard: totals, pipeline by stage, follow-ups pending/overdue, conversion rate
- [x] Frontend: dashboard, lead list/detail/create/edit, customer list/detail, reusable activity log
- [x] Unit/integration tests: 7 new integration tests (CRUD, conversion, RBAC, tenant isolation,
      dashboard scoping) — all passing alongside the existing Milestone 1 suite

## Milestone 3 — Projects + Inventory ✅
- [x] Projects: type (Society/Building/Town Planning/Construction/Commercial/Other), code, address,
      status, start/end dates, map anchor (lat/lng + optional GeoJSON)
- [x] Project hierarchy: a single self-referencing `ProjectNode` table (Phase/Zone/Block/Building/Floor)
      so each project type can nest only the levels it actually needs, instead of fixed tables per level
- [x] Inventory units: plots/apartments/offices/shops/houses/commercial/other, project-scoped unique
      code, area + unit (SqFt/SqYd/SqM/Marla/Kanal/Acre), optional hierarchy-node placement, map point
- [x] Inventory status lifecycle (`InventoryStatusRules`): Available → Reserved/Booked/Blocked/
      UnderConstruction → Sold → HandedOver, with invalid transitions rejected server-side
- [x] Relationship guards: a project/node can't be deleted while it still has children; an inventory
      unit can only be hard-deleted while `Available` (its identity is safe to reuse once booking exists)
- [x] Search/filtering API: by project, hierarchy node, type, status, area range, code/number
- [x] Map foundation: lat/lng + GeoJSON columns on both projects and inventory units, plus a practical
      first map view (lightweight bounding-box scatter plot, no external GIS dependency yet)
- [x] Frontend: project list/detail/create/edit, hierarchy tree management, inventory list/detail/
      create/edit with list+map toggle and filters, reusing the CRM module's design patterns
- [x] Unit/integration tests: 14 new integration tests (project/hierarchy/inventory CRUD, uniqueness,
      status transitions, relationship guards, filtering, tenant isolation, RBAC, coordinate
      persistence) — all passing alongside the existing suite (46 total)

## Milestone 4 — Sales Booking & Payment Plans ✅
- [x] Booking: number/reference, customer, agent, project, inventory unit, date, status, total/discount/net
      price, notes — status lifecycle Draft → PendingApproval → Confirmed, Cancelled reachable from any
      non-terminal state, invalid transitions rejected (`BookingStatusRules`)
- [x] Double-booking protection is a real database constraint, not just an app-level check: a partial
      unique index on `bookings.InventoryUnitId` (active statuses only) — verified under genuine
      concurrent requests, not just sequential ones
- [x] Inventory integration: only `Available` units can be booked; Confirmed moves the unit to `Booked`;
      Cancelled releases it back to `Available` and cancels any still-open installments
- [x] Payment plans: booking amount + down payment + N periodic installments, both percentage-based and
      fixed-amount custom schedules, auto-generated even schedules, all reconciled exactly against the
      booking's net price (rounding remainder absorbed by the last installment)
- [x] Installments: Pending/PartiallyPaid/Paid/Cancelled are persisted; Overdue is computed at read time
      from due date + grace period, so nothing needs a background job to keep it in sync
- [x] Payments: receipt-numbered, partial payments accumulate on an installment, overpayment beyond the
      outstanding amount is rejected outright (no credit-balance/overpayment handling in this milestone —
      documented limitation, not an oversight)
- [x] Sales dashboard: booking counts by status, inventory availability summary, total booking value,
      collected/outstanding amounts, overdue installment count, recent bookings — all tenant-scoped
- [x] Frontend: sales dashboard, booking list/create/detail, payment plan configuration (even-split or
      custom schedule builder), installment schedule table, payment recording, status action buttons
- [x] Unit/integration tests: 18 new integration tests covering booking/customer/inventory relationships,
      unavailable-inventory rejection, genuine concurrent double-booking, status transitions, cancellation
      side effects, schedule reconciliation (both plan types), partial payments, overpayment rejection,
      overdue computation, tenant isolation, RBAC, dashboard scoping, and audit logging — all passing
      alongside the existing suite (64 total)

## Milestone 5 — Finance & Accounting Foundation ✅
- [x] Chart of accounts: Asset/Liability/Equity/Revenue/Expense types, self-referencing hierarchy with
      cycle rejection, tenant-unique codes, system-vs-user-defined accounts; the two minimum accounts a
      tenant needs (Cash and Bank, Sales Revenue) are seeded automatically at tenant creation — not from
      the global DbSeeder, since accounts are tenant-owned data
- [x] Double-entry journal: JournalEntry + JournalLine, balance enforced server-side both at draft
      creation and again at posting (never persisted unbalanced), Draft -> Posted -> immutable (no edit
      endpoint — a wrong draft is cancelled and recreated), Draft -> Cancelled
- [x] FinancialDocument: a reusable invoice/receipt/credit-note/debit-note envelope shared across future
      modules — no tax engine, no line items yet, just the numbering/status/reference shell
- [x] Sales integration: `ISalesPaymentPostingService` adds the journal entry (Dr Cash and Bank, Cr Sales
      Revenue) and a Receipt document to the same DbContext Sales' PaymentService already uses, inside the
      same transaction — one SaveChanges, so the payment and its ledger postings commit or roll back
      together; a per-tenant unique index on (ReferenceType, ReferenceId) plus a payment-level
      IdempotencyKey stop a retried request from ever posting twice. See docs/DATABASE.md for the mapping.
- [x] Receivables: a projection over Sales installments (no new source-of-truth table), by customer, with
      outstanding amount and computed overdue status
- [x] Finance dashboard: revenue, collected, receivable/overdue, expenses, asset/liability/equity
      summary, recent journal entries — all tenant-scoped
- [x] Reports: trial balance (reconciles by construction — every posted entry balances, so the aggregate
      does too) and an income summary (revenue − expenses) over an optional date range
- [x] Frontend: finance dashboard, chart of accounts list/create, journal list/detail with post/cancel
      actions and a manual-entry builder, receivables list, trial balance view
- [x] Unit/integration tests: 16 new integration tests covering account CRUD, hierarchy + circular-hierarchy
      rejection, system-account protection, balanced/unbalanced journal entries, posted-entry immutability,
      automatic Sales -> Finance posting, overpayment creating no journal entry, idempotent duplicate
      payments, receivable calculation, tenant-scoped dashboards, trial balance reconciliation, RBAC, and
      audit logging — all passing alongside the existing suite (80 total)
- [x] Live end-to-end verification: Customer -> Booking -> Payment Plan -> Installment -> Payment ->
      Financial Journal -> Receivable -> Dashboard/Trial Balance run against the real API, every figure
      reconciling exactly

## Milestone 6 — Construction & Procurement ✅
- [x] Work packages: extend Projects (by reference, not modification) with phase/work-package name/code,
      planned/actual dates, budget, assigned manager, progress percent; status lifecycle Planned ->
      InProgress/OnHold -> Completed/Cancelled (`WorkPackageStatusRules`), tenant-unique code per project
- [x] Construction tasks: title/description/priority/assignee/dates/progress under a work package, status
      lifecycle Planned -> InProgress -> Blocked/Completed/Cancelled (`ConstructionTaskStatusRules`), a
      single-predecessor dependency foundation (`DependsOnTaskId`), server-computed delay detection
- [x] Vendors: standalone procurement-side profile (name/contact/address/tax registration/active/notes) —
      deliberately not merged with the existing CRM `Customer` model
- [x] Purchase requests: numbered (`PR-000001`...), project/work-package scoped, line items (material,
      qty, estimated unit price), status lifecycle Draft -> Submitted -> Approved/Rejected/Cancelled
      (`PurchaseRequestStatusRules`) with approval gated behind a separate permission from creation
- [x] Purchase orders: numbered (`PO-000001`...), vendor + optional linked purchase request, line items,
      subtotal/discount/tax/total always computed server-side (never trusted from the client), status
      lifecycle Draft -> PendingApproval -> Approved -> Sent -> PartiallyReceived/Received, Cancelled
      reachable from any non-terminal state (`PurchaseOrderStatusRules`)
- [x] Material receipts (GRN): partial receiving supported and reconciled against ordered quantity two
      ways — an application-level pre-check (friendly 409) and a DB-level CHECK constraint
      (`ReceivedQuantity <= Quantity`) as a race-condition safety net; PO status auto-derives to
      PartiallyReceived/Received through the same status-rule gate used for manual transitions
- [x] Materials/inventory foundation: SKU-coded items with current/minimum quantity, kept entirely
      separate from the real-estate `InventoryUnit`/plot inventory; stock movements (Receipt/Issue/
      Adjustment) give a full audit trail, receiving auto-posts a Receipt movement, manual Issue/
      Adjustment movements reject anything that would take quantity negative
- [x] Expenses: project/work-package scoped, categorized (Labor/Materials/Equipment/Subcontractor/Other),
      created Pending, Approve/Reject only (no edit-after-creation) — payroll expenses out of scope
- [x] Finance integration: `IConstructionFinancePostingService` posts Dr Construction Expenses / Cr
      Accounts Payable on expense approval, inside the same transaction as the approval itself (mirrors
      the Milestone 5 Sales -> Finance pattern exactly); two new system accounts (`2200` Accounts
      Payable, `5200` Construction Expenses) are seeded per tenant alongside the Milestone 5 accounts.
      See `docs/DATABASE.md` for the accounting mapping.
- [x] Construction dashboard: active projects, work packages (+ in-progress), tasks (+ delayed/completed),
      purchase requests pending approval, open purchase orders, total budget vs. actual expenses, recent
      work packages — all tenant-scoped
- [x] Procurement dashboard: purchase requests pending approval, total/pending/partially-received purchase
      orders, active vendors, total procurement value, recent purchase orders — all tenant-scoped
- [x] Frontend: construction dashboard, work package/task list+detail, vendor list+detail, purchase
      request list/create/detail with approval actions, purchase order list/create/detail with a
      receiving dialog, materials list+detail with stock-movement recording, expense list/create with
      approve/reject, procurement dashboard, new sidebar sections and routes — reusing the existing
      table/dialog/form/permission-gate patterns rather than introducing new UI primitives
- [x] Unit/integration tests: 14 new integration tests covering vendor/work-package/task CRUD and status
      transitions, the full purchase request and purchase order lifecycles, PO total calculation, partial
      receiving, over-receiving rejection, material stock movement (including negative-stock rejection),
      expense approval posting a balanced journal entry (and rejection posting none), tenant isolation,
      RBAC, dashboard scoping, and audit logging — all passing alongside the existing suite (94 total:
      12 unit + 82 integration)
- [x] Live end-to-end verification: Project -> Work Package -> Purchase Request -> Approval -> Vendor ->
      Purchase Order -> Partial Receipt -> Over-receive rejection -> Final Receipt -> Material Stock ->
      Expense -> Finance Journal -> Dashboards, run against the real API, every figure reconciling exactly
      (PO subtotal/total, received quantities, material stock, journal Dr/Cr, dashboard aggregates)

## Milestone 7 — Property & Rental Management ✅
- [x] Properties: code/name/type (Building/ApartmentComplex/CommercialProperty/OfficeBuilding/
      ShoppingProperty/House/Other)/status/description/address/owner-information foundation,
      tenant-unique code, kept fully separate from Projects.Project (a development/sales project is not
      an operating rental asset)
- [x] Property units: rentable units under a property with an optional free-text building/block
      reference, type, floor, area, bedrooms, market rent rate; occupancy status (Available/Reserved/
      Occupied/Maintenance/Inactive) is a distinct enum from Projects.InventoryUnitStatus — Occupied is
      only ever set/cleared by lease activation/termination, never a manual transition
- [x] Rental tenants: a thin overlay (company flag, identification number, active flag, notes) on the
      existing CRM `Customer` for name/contact/address — reuses Customer rather than duplicating it; a
      tenant can attach to an existing customer or create a new one in the same request
- [x] Leases: property/unit/tenant, dates, rent amount, security deposit, payment frequency (Monthly/
      Quarterly/Yearly foundation), grace period, status lifecycle Draft -> PendingApproval -> Active ->
      Expired/Terminated, Cancelled reachable only before Active (`LeaseStatusRules`); a **partial unique
      index on `leases.UnitId` (`WHERE "Status" < 3`)** is the actual conflicting-lease guard, mirroring
      Sales' double-booking constraint — only one non-terminal lease per unit at a time, enforced at the
      database level, not just in application code
- [x] Rent schedule: generated deterministically from a lease's dates/frequency the moment it becomes
      Active (same dates + frequency always produce the same periods), not hand-configured like Sales'
      payment plans — a deliberately separate, simpler model from `Installment`; "Overdue" is computed at
      read time from due date + grace period, never persisted, mirroring `InstallmentStatus`'s convention
- [x] Rent payments: partial payments accumulate per schedule line, overpayment rejected server-side,
      idempotency-key protected against duplicate submission, reuses `Sales.PaymentMethod` rather than a
      new enum — the whole recording flow mirrors Sales' `PaymentService` pattern line for line
- [x] Finance integration: `IRentalPaymentPostingService` posts Dr Cash and Bank / Cr Rental Revenue in
      the same transaction as the payment, atomically; a new system account (`4100` Rental Revenue) is
      seeded per tenant alongside the existing ones; the existing (TenantId, ReferenceType, ReferenceId)
      unique index on `journal_entries` (from Milestone 5) already blocks a duplicate posting for the same
      payment without any new schema. See `docs/DATABASE.md` for the mapping.
- [x] Security deposits: one per lease (auto-created at lease creation when the deposit amount is > 0),
      Pending -> Held (received) -> Refunded/PartiallyRefunded/Forfeited, over-refund rejected server-side
      — no escrow/interest/legal rules yet, deliberately
- [x] Maintenance requests: property/unit/tenant, category, priority, status lifecycle Open -> Assigned ->
      InProgress -> Resolved (OnHold as a detour, Cancelled from any non-terminal state), vendor
      assignment reuses the existing Procurement `Vendor` table by FK — no second vendor concept, no
      second procurement workflow
- [x] Property dashboard: properties/units/occupancy, active/expiring leases, monthly rental income
      (frequency-normalized), outstanding/overdue rent, open maintenance requests, per-property
      performance summary — all tenant-scoped
- [x] Rental dashboard: active leases, upcoming expirations, rent due/collected/outstanding, overdue
      obligation count, occupancy summary, recent payments — all tenant-scoped
- [x] Frontend: property/unit/tenant list+detail+forms, a lease detail page combining status actions,
      rent schedule, payment recording and history, and the security deposit card in one place,
      maintenance list/detail with vendor assignment, both dashboards, new sidebar/routing — reusing the
      Construction/Procurement module's table/dialog/form/permission-gate patterns
- [x] Unit/integration tests: 16 new integration tests covering property/unit CRUD, tenant-customer
      reuse and duplicate-link rejection, lease date validation, the full lease lifecycle (rent schedule
      generation + unit occupancy), conflicting-lease rejection, termination releasing the unit, partial/
      overpayment/idempotent rent payments with finance posting, overdue computation, the security
      deposit receive/refund/over-refund lifecycle, the full maintenance lifecycle with vendor assignment,
      tenant isolation, RBAC, dashboard scoping, and audit logging — all passing alongside the existing
      suite (110 total: 12 unit + 98 integration)
- [x] Live end-to-end verification: Property -> Unit -> Tenant -> Lease -> Rent Schedule -> Rent Payment
      -> Finance Journal -> Dashboards, and separately Unit -> Maintenance Request -> Vendor -> Resolution,
      run against the real API, every figure reconciling exactly (rent schedule totals, partial/
      over-payment handling, deposit amount, journal Dr/Cr, dashboard aggregates)

## Notes on scope realism
This is a genuinely large, multi-quarter product (50 functional areas). Each
milestone above ships real, persisted, tested functionality rather than
scaffolding — so later milestones (Construction, Property/Rental, Facility,
SaaS billing) will each take substantial follow-on sessions. The foundation in
Milestone 1 is built so every later module plugs in without rework: tenant
isolation, permission checks, audit logging, validation pipeline, and API/DTO
conventions are established once and reused everywhere.
