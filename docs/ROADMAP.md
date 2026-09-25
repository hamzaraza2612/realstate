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
| 8 | Facility Management + Mall + Coworking: shared spaces/utilities/service requests, mall shops/service charges/parking/events/notices, coworking memberships/desks/rooms/bookings | ✅ |
| 9 | Product Gap Audit: full commercial-readiness audit against the platform's business/architecture/finance/security/frontend/reporting/SaaS/portal/production targets — see `PRODUCT_GAP_AUDIT.md` | ✅ |
| 10 | Security & Finance Hardening: tenant-status enforcement at login/refresh/every protected API call, a re-verification authorization pass, AP clearing, fiscal-period close/reopen, journal reversal, Balance Sheet/P&L/Cash Flow reports | ✅ |
| 11 | Documents + Notifications + Approvals + Communication Foundation: generic document/attachment system, in-app notifications + preferences, generic approval workflow (Expense/PurchaseOrder/Booking plugged in), email provider abstraction with a development-safe default | ✅ |
| 12 | Reporting: cross-module dashboards (AR/AP aging, today's sales, project profitability, agent performance), exports, wire up `recharts` | ⬜ |
| 13 | Portals: customer/owner/tenant/member/vendor/agent portals (depends on Milestone 11's email abstraction gaining a real SMTP/SendGrid provider) | ⬜ |
| 14 | SaaS: subscription lifecycle automation, platform billing/invoicing, self-service signup, feature-entitlement enforcement | ⬜ |
| 15 | Production hardening: TLS/reverse-proxy guidance, observability, backups, multi-currency, credit/debit notes, tax engine, optimistic concurrency, confirm-dialogs on the remaining older destructive status actions (Sales/Coworking/Maintenance cancel), the two Facility/Mall status-transition gaps, object storage (S3/Blob) provider for Documents | ⬜ |

Milestones 10–15 were resequenced by `PRODUCT_GAP_AUDIT.md` (originally 9–13 as Portals→Documents→Reporting→SaaS→Production): tenant-status enforcement and core accounting integrity are prerequisites every later module silently inherits. Documents/Notifications/Approvals/Communication landed as Milestone 11 (ahead of Reporting) once scoped — the email *abstraction* (`IEmailSender`, a development-safe logging provider) is now in place, but a real SMTP/SendGrid implementation of that interface is still a prerequisite for Milestone 13's portals (a portal invite/password-reset flow needs mail to actually leave the building, not just be logged).

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

## Milestone 8 — Facility Management, Shopping Mall & Coworking ✅
- [x] Built as one shared Facility Management foundation (Facility, Space, UtilityReading,
      ServiceRequest, FacilityPayment) with Mall and Coworking as specializations on top — not three
      independent systems; a Facility always references an existing Property, and a Space optionally
      bridges to an existing PropertyUnit (`Space.PropertyUnitId`) rather than duplicating it
- [x] Facilities: code/property/type (ShoppingMall/Coworking/OfficeBuilding/CommercialBuilding/
      MixedUse/Other)/operating status/manager/description, tenant-unique code
- [x] Spaces: generic rentable/usable areas (shop/office/coworking-area/parking-area/common-area),
      occupancy status kept as its own enum — distinct from both Projects.InventoryUnitStatus and
      Property.PropertyUnitStatus, never conflated; Occupied is only ever set by the owning workflow
      (lease activation for a mall shop), never a manual transition
- [x] Mall: a shop is a Space (Type=Shop) whose creation auto-creates the backing PropertyUnit in the
      same call; shop assignment/leasing is the **existing** `Property.Lease`/`RentalTenant` completely
      unmodified — `LeaseService` was extended (additively) to also sync a shop's linked Space status
      alongside the PropertyUnit's when a lease activates/terminates, so the two stay consistent without
      duplicating lease logic in the Facility module. Service charges (fixed or per-area-unit,
      deterministic calculation verified byte-for-byte in tests), parking (space + allocation, one
      active allocation per space enforced by a partial unique index), events, and tenant notices round
      out the mall-specific layer
- [x] Coworking: `CoworkingMember` mirrors `RentalTenant`'s design (an overlay on the existing CRM
      Customer, not a new customer concept); membership plans, memberships (Active/Expired/Cancelled,
      no reactivation), desks and meeting rooms under a coworking Space, and bookings with a price
      computed deterministically from the resource's rate × duration
- [x] Bookings: "no overlapping resource bookings" is enforced at the database level with a genuine
      Postgres range-EXCLUDE constraint (`EXCLUDE USING gist`, requiring the `btree_gist` extension) on
      (tenant, resource type, resource id, time range) for non-cancelled bookings — not just a unique
      index, since bookings overlap on a continuous time axis — backed by an application-level pre-check
      for a friendly error message; verified under both paths
- [x] Utilities: a cumulative-meter-reading foundation (Electricity/Water/Gas/Other) — a reading below
      the previous one for the same meter is rejected as physically invalid; consumption and billable
      amount are computed and stored at reading time, no smart-meter integration
- [x] Facility maintenance/service requests: **extended** the existing `Property.MaintenanceRequest`
      additively (nullable FacilityId/SpaceId/SlaHours/SlaDueAt) instead of a parallel "facility
      maintenance" entity; a separate but structurally identical `ServiceRequest` entity covers
      operational asks (cleaning/security/IT/front-desk) and deliberately reuses
      `Property.MaintenancePriority`/`MaintenanceStatus`/`MaintenanceStatusRules` rather than
      redefining an equivalent vocabulary; vendor assignment on both reuses the existing Procurement
      `Vendor` table — no second vendor concept, no second procurement workflow
- [x] Finance integration: one shared `IFacilityFinancePostingService`/`FacilityPaymentService` handles
      billing for every subtype (service charges, parking, coworking memberships, coworking bookings,
      utility charges) — each chargeable record just needs an Amount/PaidAmount pair, avoiding five
      near-duplicate payment entities; Dr Cash and Bank / Cr **Facility Revenue** (`4200`, new system
      account) posted atomically with the payment; duplicate-posting protection reuses the existing
      (TenantId, ReferenceType, ReferenceId) unique index on `journal_entries` from Milestone 5, tagging
      each subtype with its own ReferenceType (e.g. `FacilityServiceCharge`) for traceability — no new
      schema needed. See `docs/DATABASE.md` for the mapping.
- [x] Facility dashboard: facilities/spaces/occupancy, active tenants-or-members, open maintenance/
      service requests, total revenue and outstanding receivables (summed across all five billing
      subtypes), utility consumption/amount by type, upcoming events — all tenant-scoped
- [x] Mall dashboard and Coworking dashboard: shop/desk occupancy, rent/service-charge/membership
      figures, parking usage, upcoming bookings/events, utilization — both optionally scoped to one
      facility or aggregated across all facilities of that type, and always tenant-scoped
- [x] Frontend: a "Facility" section (dashboard, facilities, spaces, service requests, utilities) plus
      "Mall" and "Coworking" sections built on top of it, mirroring the backend's shared-foundation
      structure; one reusable "Record Payment" dialog/hook shared across all five billing subtypes
      instead of five separate payment UIs; the existing Maintenance Request form was extended
      (not duplicated) with optional Facility/Space fields
- [x] Unit/integration tests: 14 new integration tests covering facility/space CRUD, the full mall
      workflow (shop creation → existing-Lease assignment → deterministic service-charge generation →
      duplicate-charge rejection → payment → Finance posting), parking allocation lifecycle (including
      the one-active-allocation-per-space guard), event/notice lifecycle, coworking membership lifecycle
      with Finance posting, booking creation with overlap rejection then a non-overlapping booking
      succeeding, idempotent payment retry, utility reading validation (decrease rejected) and
      consumption/amount calculation, the generic service-request lifecycle (reusing
      `MaintenanceStatusRules`), facility maintenance via the extended existing infrastructure, tenant
      isolation, RBAC, dashboard scoping, and audit logging — all passing alongside the existing suite
      (124 total: 12 unit + 112 integration)
- [x] Live end-to-end verification, run against the real API: the full Mall workflow (Property → Mall
      Facility → Shop → Tenant → Lease → Service Charge → Payment → Finance journal → Mall Dashboard),
      the full Coworking workflow (Facility → Membership Plan → Member → Desk/Room → Booking → Payment →
      Finance journal → Coworking Dashboard, including a live 409 on an overlapping booking), and the
      Facility → Maintenance/Service Request → Vendor → Resolution workflow — every figure reconciling
      exactly (deterministic service-charge and booking-price calculations, balanced Finance journals on
      the new Facility Revenue account, dashboard aggregates)

## Milestone 10 — Security & Finance Hardening ✅
- [x] Tenant-status enforcement: a Suspended/Cancelled tenant's users can no longer log in or refresh
      their token (`AuthService`), and a per-request `TenantStatusMiddleware` (after `UseAuthentication`,
      before `UseAuthorization`) rejects an already-issued, still-cryptographically-valid JWT the moment
      its tenant is suspended — closing the exact gap `PRODUCT_GAP_AUDIT.md` §9 flagged (`TenantStatus`
      existed as a column but was never enforced anywhere). Reactivating a tenant restores access
      immediately with no other state change needed. Super Admin (no `TenantId`) is never affected.
- [x] Authorization re-verification pass (no new defects found beyond the three fixed in Milestone 9):
      permission-attribute coverage, IDOR, refresh-token handling, rate limiting, and audit logging were
      all re-checked against the Milestone 9 audit's findings and remain solid.
- [x] Fiscal periods: a new opt-in `FiscalPeriod` entity (Open/Closed) with a genuine Postgres
      range-EXCLUDE constraint preventing overlapping periods per tenant (reusing the `btree_gist`
      extension enabled in Milestone 8) — a date with no defined period is always unrestricted, so a
      tenant that never creates one sees no behavior change. A shared `FiscalPeriodGuard` helper is
      called from all five journal-entry-creation paths (manual entries plus all four system posting
      services) to reject a post dated into a Closed period.
- [x] Journal reversal: `POST /finance/journal-entries/{id}/reverse` posts a new, fully Debit/Credit-
      swapped entry against a Posted one and marks the original `IsReversed` — the original is never
      edited or deleted. Reuses the existing `(TenantId, ReferenceType, ReferenceId)` unique index (new
      `ReferenceType = "Reversal"`, `ReferenceId` = the original entry's id) for double-reversal
      protection at the database level, not just in application code.
- [x] AP clearing: a new `ExpensePayment` entity (mirrors the `RentPayment`/`FacilityPayment` source-
      row-per-posting pattern) lets an Approved Construction Expense be paid down, partially or in full,
      via `IConstructionFinancePostingService.PostExpensePaymentAsync` (Dr Accounts Payable, Cr Cash) —
      closing the "AP only ever grows, never clears" gap from `PRODUCT_GAP_AUDIT.md` §5. Overpayment
      beyond the outstanding balance is rejected the same way `RentPaymentService` already does.
- [x] Financial statements: `GET /finance/reports/balance-sheet`, `/profit-and-loss`, and `/cash-flow`
      added alongside the existing Trial Balance/Income Summary — Balance Sheet includes a computed Net
      Income line so `TotalAssets = TotalLiabilities + TotalEquity + NetIncome` always holds by
      double-entry construction (verified live and in tests, not just asserted); Cash Flow groups postings
      to the Cash account by `ReferenceType` and verifies `OpeningCash + NetChange = ClosingCash`.
- [x] UAE/global-readiness check (no implementation, per the milestone's own scope): confirmed no
      Pakistan-specific hardcoding exists anywhere in money/date handling; the `en-US`/`$`-hardcoded
      dashboard formatting already flagged in `PRODUCT_GAP_AUDIT.md` §7 remains a known, deferred
      multi-currency item, not touched here.
- [x] Frontend: a new Fiscal Periods page (create/close/reopen, each close/reopen gated by
      `ConfirmDialog`); a "Reverse" action on the Journal Entry detail page (reason dialog doubles as the
      confirmation step, destructive-styled submit); a "Record payment" dialog on the Expenses page for
      AP clearing; three new report pages (Balance Sheet, Profit & Loss, Cash Flow) modeled on the
      existing Trial Balance page's layout and loading/error/empty conventions.
- [x] Unit/integration tests: 16 new integration tests covering suspended/cancelled-tenant login and
      refresh rejection, an already-issued token being blocked mid-session, reactivation restoring
      access, Super Admin being unaffected, same-named custom roles now succeeding independently per
      tenant, fiscal-period close/reopen/overlap-rejection, closed-period posting rejection with an
      unrestricted-when-no-period-defined control case, journal reversal (debit/credit swap verified
      line-by-line, double-reversal rejected, Draft entries cannot be reversed), AP clearing (pre-approval
      payment rejected, partial payment, overpayment rejected, final payment), and the Balance
      Sheet/Profit & Loss/Cash Flow reconciliation identities — all passing alongside the existing suite
      (141 total: 12 unit + 129 integration), with zero regressions in the 113 pre-existing tests.
- [x] Live end-to-end verification against the real running API: suspend → login blocked (401) → an
      already-issued token blocked on a protected endpoint (403) → reactivate → login restored; fiscal
      period created → closed → backdated post rejected (400) → reopened → retry succeeds (201); journal
      entry posted → reversed (debit/credit swap confirmed) → double-reversal rejected (400); expense
      created → approved → paid in full via AP clearing (`journalEntryId` set, `paidAmount` updated); all
      three financial statements fetched and their reconciliation identities held exactly on real,
      non-trivial numbers.

## Milestone 11 — Documents + Notifications + Approvals + Communication Foundation ✅
- [x] Documents: a single `Document`/`DocumentVersion` pair attaches to *any* business entity via a
      polymorphic `(EntityType, EntityId)` reference — no per-module document table, no join table per
      entity type, and a new entity type is just a new string constant (`DocumentEntityTypes`), not a
      migration. `IFileStorageService` is the storage abstraction (`LocalFileStorageService` is the only
      implementation for this deployment; a future S3/Blob provider implements the same three methods
      with nothing above it changing) — storage keys are `{tenantId}/{new Guid}`, never derived from the
      caller's filename, so path traversal has no surface to exploit at all rather than being merely
      sanitized against. Every upload is validated for size, an allow-listed Content-Type, *and* a
      magic-byte signature check against the declared type (`FileSignatureValidator`) — a declared
      `application/pdf` whose bytes don't start with `%PDF` is rejected, not trusted. Versioning is a
      real, immutable history (`DocumentVersion` rows are never mutated, only added); delete removes the
      document, every version, and the underlying stored files together. Gated by two permissions
      (`documents.view`/`documents.manage`) shared across every entity type, mirroring how `AuditLogs`
      already spans every module behind one permission rather than one per attached entity.
- [x] Notifications: in-app `Notification` rows scoped to `(TenantId, UserId)`, read/unread with
      `MarkReadAsync`/`MarkAllReadAsync`, and per-user-per-category `NotificationPreference` (defaults to
      both channels enabled when no row exists yet). No permission gate on the notification endpoints —
      every action is scoped to the caller's own `UserId` server-side, which is a stronger check than a
      role permission would add on top. Code-defined `NotificationTemplates` give consistent wording per
      category (a v1, non-database-editable template system — a reasonable scope for a platform
      primitive most modules only use once or twice).
- [x] Communication: `ICommunicationService` is the single entry point every module calls to notify a
      user — resolves preferences, creates the in-app `Notification` when allowed, calls `IEmailSender`
      when allowed, and always writes a `CommunicationLog` row per channel actually attempted
      (Sent/Failed/Skipped). `IEmailSender`'s only registered implementation, `LoggingEmailSender`, never
      contacts a real mail server — it logs and returns success, so the application and every test run
      with zero SMTP dependency; a production deployment registers a real SMTP/SendGrid implementation of
      the same interface with nothing else changing. `CommunicationChannel` is a `[Flags]` enum already
      naming `WhatsApp`/`Sms`/`Push` as future adapters — requesting them today is logged `Skipped`
      ("provider not yet implemented"), not an error, so a caller can already ask for "notify everywhere"
      without those providers existing yet.
- [x] Approvals: a generic `ApprovalRequest` (also `(EntityType, EntityId)`-addressed) with either a
      named `ApproverUserId` or a `RequiredPermission` ("anyone in this tenant holding this permission
      may decide it") — `GetUsersWithPermissionAsync` explicitly re-scopes to the current tenant rather
      than trusting a bare `RolePermissions`/`UserRoles` join, because a shared system role (`TenantId`
      null, assigned to users across every tenant that uses it) would otherwise leak a notification to
      another tenant's staff; this was found and fixed during this milestone, the same class of bug as
      Milestone 9's role-permission leak but via a different path. Concurrent/duplicate decisions are
      protected two ways: an application-level `Status != Pending` guard, and — the first real use of
      Postgres's `xmin` system column as an EF Core optimistic-concurrency token anywhere in this domain
      model (`UseXminAsConcurrencyToken()`) — a genuine database-level race guard for the case two
      approvers decide the same request in the same instant, both mapped to the same `already_decided`
      outcome a sequential race would have produced. Expense/PurchaseOrder/Booking are wired
      *bidirectionally* without `ApprovalService` ever referencing those modules: each registers an
      `IApprovalLinkedEntityHandler` (`ExpenseApprovalHandler`, etc.) that `ApprovalService.DecideAsync`
      looks up by `EntityType` and invokes after committing its own decision, so deciding via the generic
      Approval Inbox actually approves/rejects the Expense/PurchaseOrder/Booking too — not just a
      parallel tracking record. The handler is resolved lazily via `IServiceProvider` inside the method
      call rather than constructor-injected, specifically to break the circular dependency this creates
      (`ApprovalService → ExpenseApprovalHandler → IExpenseService → ApprovalService`) without breaking
      either direction of the integration. None of Expense/PurchaseOrder/Booking's own status-machine
      code changed — the approval hooks are additive calls at their existing transition points.
- [x] Frontend: `DocumentsPanel` (reusable attach/list/upload/version-history/download/delete widget,
      permission-gated on `documents.manage`) mounted on Customer/Booking/Purchase Order detail pages; a
      standalone `/documents` browser page; a Notification Bell in the Topbar (unread badge, 30s poll,
      mark-read/mark-all-read, best-effort deep links) plus `/notifications` and
      `/notifications/preferences` pages; an `/approvals` inbox (approve/reject with comments) and an
      `ApprovalHistoryCard` mounted on Booking/Purchase Order detail pages (gated on `approvals.view`).
      Independently verified against the actual backend source after the implementing agent's handback:
      routes, query-param names, DTO field names, and permission codes all confirmed to match the
      controllers/DTOs exactly; the numeric-enum + label-map convention used consistently with no stray
      string-literal status comparisons; `npm run build` re-run independently and confirmed to exit 0
      with zero TypeScript errors. No backend files were touched by the frontend work.
- [x] Unit/integration tests: 21 new integration tests covering document upload/download/cross-tenant
      denial/unsupported-type rejection/size-limit rejection/content-type-spoofing rejection/unknown-
      entity-type rejection/version history/delete-and-permission-enforcement/audit logging; approval
      creation-on-submission, inbox visibility, bidirectional module-to-approval and approval-to-module
      resolution, unauthorized-approver rejection, duplicate-decision rejection, genuine concurrent-
      decision race (two simultaneous HTTP requests, exactly one wins), tenant isolation, and audit
      history; notification creation via the real approval flow, read/unread, mark-all-read, tenant
      isolation, and preference-driven suppression; communication dev-provider delivery with zero SMTP
      configured anywhere in the test process, preference-driven channel skipping, and tenant-scoped
      communication-log visibility — all passing alongside the existing suite (162 total: 12 unit + 150
      integration), zero regressions in the 129 pre-existing tests.
- [x] Live end-to-end verification against the real running API: a PDF uploaded, downloaded back
      byte-for-byte identical, a second version added, then the document deleted and confirmed
      unretrievable (404); an Expense created (auto-creating its ApprovalRequest), decided via the
      generic Approval Inbox, and the Expense's own status confirmed Approved — proving the bidirectional
      dispatch, not just the one-directional path; unread-notification count and communication-log
      entries (2 in-app + 2 email, both logged Sent) confirmed for the same flow.

## Milestone 12 — Cross-Module Reporting & Analytics ✅
- [x] A unified, read-only reporting layer over existing modules' data — not a new business module.
      Every report either queries existing tables directly (server-side `GroupBy`/`Sum`/`Count`, no
      full-entity-graph loads) or calls straight into another module's already-implemented service
      (Finance's Profit & Loss/Cash Flow, Property's occupancy, CRM's conversion rate) instead of
      recomputing it a second way. Full KPI/report definitions — calculation, date range, tenant
      scope, included/excluded statuses — are in `docs/REPORTING.md`, not restated here.
- [x] Executive Dashboard (`GET /reports/executive`): Sales, Collections, Revenue/Expenses/Profit
      (reused from Finance P&L), Rental Collected, Receivables, Payables, Cash Position (reused from
      Finance Cash Flow), Active Projects, Inventory availability, Property Occupancy (reused),
      Rental Outstanding, Construction Progress, Procurement Exposure, Maintenance Backlog, and
      Leads/Conversion (reused from CRM) — each field's doc comment states whether it's a period sum
      over `[from, to]` or an as-of-now snapshot, mirroring how a Balance Sheet line and a P&L line
      differ in kind.
- [x] Sales Reports: by-project/-period/-agent, booking-status breakdown, booking conversion (Lead
      funnel over a date range), cancellations, collections, outstanding-installments (delegates
      directly to the existing Finance Receivables list, not duplicated), and a new receivable-aging
      report (0/1-30/31-60/61-90/90+ day buckets — the AR aging the audit's §8 flagged as missing).
- [x] Finance Reports: new AR aging, AP aging (built fresh — no AP ledger view existed before this
      milestone), revenue/expense/collections trend series. Trial Balance/Income Summary/Balance
      Sheet/P&L/Cash Flow deliberately stay at their existing `/finance/reports/*` routes, not
      duplicated under `/reports/*`.
- [x] Project Reports: inventory availability, sold-vs-available, sales/collection summaries, and a
      genuine **project profitability** report (Confirmed sales revenue minus Approved Construction
      expenses, per project) — documented explicitly as a direct/gross margin only, since the domain
      model tracks no per-project overhead allocation; and progress (average WorkPackage progress,
      `null` — not 0% — for a project with no work packages yet).
- [x] Construction/Procurement Reports: work-package progress, expenses by category, budget-vs-actual
      (using the real `WorkPackage.Budget` field — `Project`/`ConstructionTask` have no budget field
      in the current model, so no report was fabricated for those levels), purchase-order exposure,
      received-vs-ordered, vendor spend, and PO status breakdown.
- [x] Property/Rental Reports: occupancy, rent billed/collected, overdue rent, revenue (rent-only —
      Facility/Mall revenue is reported separately, never mixed in), tenant aging, and lease status.
- [x] Facility/Mall/Coworking Reports: facility utilization, mall occupancy, service-charge
      collection, facility revenue (resolved per-facility by following each `FacilityPayment`'s
      polymorphic source reference back to its owning Facility — the payment ledger itself carries
      no direct FacilityId), parking utilization, event summary, coworking desk utilization, meeting
      room utilization (booked hours), booking trends, and a maintenance backlog scoped to the
      Facility half of the shared `MaintenanceRequest` table (age-in-days + priority).
- [x] Drill-down: every report row carries the real entity id (customer/booking/project/vendor/
      property/lease/request/vendor-assignment) a frontend links to the existing detail page with —
      no invented ids or dead links. Holding `reports.view` never grants implicit access to what a
      drill-down link points at: following it still enforces that entity's own permission (verified
      by a dedicated test — an Accountant can see a receivable-aging row's real customer but is
      still `403`'d navigating to that customer's own record without `crm.customer.view`).
- [x] Architecture: one tenant-wide `reports.view` permission gates every report controller (the
      same "one permission spans the whole area" precedent as `documents.view`/`approvals.view`);
      `ReportDateRange` resolves a missing date range to "this calendar month to date" consistently
      everywhere; `AgingBucket` is the single bucket-boundary definition every aging report shares;
      `IReportExporter`/`CsvReportExporter` implement CSV export now with Excel/PDF as a clean,
      unimplemented extension point (no dependency added for a format that isn't built yet).
- [x] Database: one migration, `AddReportingIndexes`, adding 8 composite indexes justified by the new
      reports' own filter predicates (see `docs/DATABASE.md`) — no new tables, applied and
      schema-verified against the dev database.
- [x] Frontend: a unified `/reports` area — an Executive Dashboard (13 grouped KPI cards, correctly
      distinguishing period figures from as-of-now snapshots, `null` rendered as "N/A" never as a
      fabricated 0) plus 7 tabbed report pages (Sales, Finance, Projects, Construction, Procurement,
      Property, Facility — 3 to 10 tabs each covering every report endpoint), a shared `StatCard`/
      `DateRangeFilter`/CSV-export helper, and 6 `recharts` charts (the dependency's first real use
      in this codebase) reading the app's own theme tokens so they track dark mode automatically.
      Independently verified after the implementing agent's handback: every new DTO in `types/api.ts`
      checked field-by-field against the actual backend response shapes (exact match); every
      drill-down `navigate()` call checked against the real routes in `App.tsx` (all resolve to
      genuine existing detail pages — no invented routes); grepped for stray string-literal enum
      comparisons (none — every status field reuses an existing numeric enum + label map); `npm run
      build` re-run independently and confirmed to exit 0 with zero TypeScript errors. No backend
      files were touched by the frontend work.
- [x] Unit/integration tests: 20 new integration tests covering Executive Dashboard KPI calculation
      and date-range filtering, Sales report aggregation/filtering (Confirmed-only inclusion,
      project/agent filters), receivable aging bucketing, CSV export, AP aging (Approved-only
      inclusion), a revenue-trend-vs-P&L reconciliation, Construction budget-vs-actual variance,
      Procurement exposure (Draft/Received/Cancelled exclusion), Property occupancy and overdue-rent/
      tenant-aging, Facility maintenance backlog scoping and age, RBAC (`reports.view` required),
      cross-tenant isolation across Sales/Finance/Property reports, and drill-down authorization —
      all passing alongside the existing suite (182 total: 12 unit + 170 integration), zero
      regressions in the 150 pre-existing integration tests.
- [x] Live end-to-end verification against the real running API, with two real tenants: Customer →
      Booking → Payment Plan → Payment → Executive Dashboard/Sales-by-project/Receivable-aging,
      cross-checked against Finance's own Profit & Loss and Cash Flow for the same period (exact
      reconciliation, not just non-zero); Property → Unit → Tenant → Lease → Rent Schedule → Rent
      Payment → Property occupancy/rent-collected reports; a second tenant confirmed to see zero
      rows/zero totals across Sales, Finance, and Property reports for the first tenant's data.

## Milestone 13 — External Portal Foundation & Customer/Tenant/Owner/Vendor/Agent/Member Portals ✅
- [x] A reusable external-portal identity foundation, not six independent auth systems. `PortalUser`
      is a new, separate table (not another `AppUser` role) because ASP.NET Core Identity's built-in
      unique index on `NormalizedUserName` is platform-wide, not per-tenant — the same real person
      could otherwise never hold two portal accounts with the same email at two different tenants.
      `PortalUser`'s own `(TenantId, NormalizedEmail)` unique index solves that. Portal JWTs
      deliberately reuse the same `sub`/`tenant_id` claim names as internal tokens, so
      `ITenantContext`, the EF Core global tenant filter, and the entire pre-existing
      `INotificationService` work for portal sessions with **zero code changes** — only three new
      claims (`token_use=portal`, `portal_actor_type`, `portal_actor_id`) were added, read by a new
      `IPortalContext`. Full rationale, JWT claim scheme, and the two-layer authorization-isolation
      mechanism are in the new `docs/PORTAL_ARCHITECTURE.md`.
- [x] Five external actor types (`Domain/Portal/PortalActorTypes.cs`): Customer, RentalTenant,
      PropertyOwner, Vendor, CoworkingMember — each string identical to the corresponding
      `DocumentEntityTypes` constant, enabling one uniform document/notification ownership check
      across all five with no per-type mapping table.
- [x] Customer Portal: own bookings, payment plan, payment history, documents, notifications — every
      service call composes the existing `IBookingService`/`IPaymentPlanService`/`IPaymentService`/
      `IDocumentService`/`INotificationService`, adding only an object-ownership check
      (`booking.CustomerId != CustomerId` → `not_found`) where a bare `GetAsync` doesn't already
      filter by actor.
- [x] Tenant Portal: leases, rent schedule, rent payments, security deposit, maintenance requests
      (list + create), documents, notifications — reuses `ILeaseService`/`IRentScheduleService`/
      `IRentPaymentService`/`ISecurityDepositService`/`IMaintenanceService` verbatim. A tenant can
      raise a maintenance request only against their own active/pending lease.
- [x] Owner Portal (read-only): properties, per-unit occupancy/tenant detail, rent-collected,
      overdue-rent, revenue, maintenance requests, documents, notifications — a genuinely new
      first-class `PropertyOwner` entity (no such row existed before; `Property.OwnerName`/
      `OwnerContact` were free-text only) linked via a new nullable `Property.PropertyOwnerId`.
      Rent-collected/overdue-rent/revenue reuse Milestone 12's `IPropertyReportService` verbatim,
      filtered down to the caller's own property ids after the call returns — no second reporting
      implementation.
- [x] Vendor Portal: assigned purchase orders, assigned maintenance/work requests, documents,
      notifications — reuses `IPurchaseOrderService`/`IMaintenanceService` via their existing
      `VendorId`/`AssignedVendorId` filters.
- [x] Coworking Member Portal: active membership, membership history, meeting-room/desk bookings,
      documents, notifications — reuses `IMembershipService`/Coworking `IBookingService`. No
      payment-history endpoint: Facility billing has no read-side "list payments for X" service
      (only a write-side `FacilityPaymentService`), so none was fabricated.
- [x] Agent/Broker Portal deliberately does **not** use the `PortalUser` system at all —
      `Booking.SalesAgentUserId` already references an internal `AppUser` and "Sales Agent" is
      already a seeded internal-staff role, so inventing a sixth external identity type here would
      have been exactly the unnecessary auth surface this milestone's own brief warned against.
      `AgentPortalController` is a plain `[Authorize]` controller, self-scoped to the caller's own
      `UserId` (same pattern as `NotificationsController`): assigned leads, customers, available
      inventory, bookings, follow-ups, sales performance. No commission endpoint — the domain model
      has no commission-rate/commission-ledger field anywhere to compute one from, so none was
      invented; a clean extension point wasn't needed since there's no data to build one from.
- [x] Security: two independent, redundant authorization layers guarantee "a portal token can never
      reach an internal endpoint" (a `NotPortalRequirement` on the ASP.NET Core default policy
      covers every bare `[Authorize]` controller with zero per-controller changes; an explicit
      `token_use=="portal"` rejection inside `PermissionAuthorizationHandler` covers every
      `[RequirePermission]`-gated endpoint, whose policy is freshly built per-request and does not
      inherit the default policy's requirements) and the reverse ("an internal token can never reach
      a portal endpoint" via a new `PortalOnly` named policy + `[RequirePortal]`). A third layer
      (`PortalControllerBase.WrongActorType`) stops one actor type's token from reaching another
      actor type's portal controller. Every object-level lookup (a specific booking/lease/property/
      PO/membership id) is scoped by ownership and returns `404` on a mismatch — never `403` — so a
      portal user can never distinguish "doesn't exist" from "exists but isn't yours."
- [x] Documents/Notifications: no portal-specific duplicate tables. One deliberately-wired
      integration point — `DocumentService.UploadAsync` notifies the linked `PortalUser` (if one
      exists for the uploaded document's `(EntityType, EntityId)`) via the existing
      `INotificationService`/`NotificationTemplates.DocumentUploaded` — proves the mechanism without
      claiming a completeness the codebase doesn't have; other natural trigger points (a payment
      recorded, a maintenance status change) are explicitly not wired, matching the disciplined
      narrow-scope precedent from Milestones 11–12.
- [x] Payments: `IPortalPaymentIntentProvider` extension point registered with exactly one
      implementation, `UnconfiguredPortalPaymentIntentProvider`, which always returns a clean
      `payment_provider_not_configured` failure — mirrors `LoggingEmailSender`'s "safe by default"
      shape. No real gateway wired, no "Pay Now" button; current payment/receipt history is exposed
      read-only through the existing Sales/Property payment services.
- [x] Internal admin surface: `PortalAccountsController` (`portal.manage_accounts`, one tenant-wide
      permission spanning all five actor types, same precedent as `documents.view`/`reports.view`)
      to invite/deactivate/reactivate a portal login for any actor; a new `PropertyOwnersController`
      (`property.view`/`property.manage`) for owner CRUD and property linking.
- [x] Database: one migration, `AddExternalPortalFoundation` — `portal_users`,
      `portal_refresh_tokens`, `portal_password_reset_tokens`, `property_owners` (all new tables)
      plus `properties.PropertyOwnerId` (new nullable FK column) — applied and schema-verified
      against the dev database (see `docs/DATABASE.md`).
- [x] Unit/integration tests: 14 new integration tests covering portal login (success, wrong
      password, wrong tenant slug), the same email holding independent portal accounts at two
      different tenants, portal-token-cannot-reach-internal-endpoints (both a bare `[Authorize]`
      endpoint and a `[RequirePermission]`-gated one), internal-token-cannot-reach-portal-endpoints
      plus anonymous rejection, cross-actor-type rejection within the portal, Customer Portal
      booking/payment-plan/document access with Customer-A-cannot-access-Customer-B's-booking,
      cross-tenant document-download denial, Tenant Portal lease/rent-schedule/maintenance-request
      access with Tenant-A-cannot-access-Tenant-B's-lease, Owner Portal property/rent-report access
      with Owner-A-cannot-access-Owner-B's-property, Vendor Portal PO access with
      Vendor-A-cannot-access-Vendor-B's-PO, Coworking Member Portal membership/booking access with
      Member-A-cannot-access-Member-B's-booking, Agent Portal lead/booking self-scoping with
      Agent-A-cannot-see-Agent-B's-leads, the document-upload-triggers-portal-notification wiring
      with per-actor isolation, and the portal-accounts admin lifecycle (duplicate-invite rejection,
      deactivate blocks login, reactivate restores it) — all passing alongside the existing suite
      (196 total: 12 unit + 184 integration), zero regressions in the 182 pre-existing tests.
- [x] Frontend: a separate External Portal auth surface (`usePortalAuthStore`, persisted under a
      distinct localStorage key; `portalApiClient`, its own axios instance with its own 401-refresh-
      then-retry interceptor calling `/portal/auth/refresh`) so a portal session and an internal ERP
      staff session can coexist in different tabs without either token leaking into the other's
      requests — mirrors, but never imports from, `useAuthStore`/`apiClient.ts`. A `PortalLayout`
      shell distinct from the internal `AppShell` (sticky top bar + tab nav, mobile-responsive).
      Customer, Tenant, and Owner portals fully built (dashboard, list/detail pages, documents,
      notifications); Vendor and Coworking Member portals built leaner per scope; the Agent Portal
      is a single tabbed page reusing the existing internal session/`apiClient` directly (no portal
      auth), linked from the internal Sidebar. A shared `createPortalCommonApi` factory generates the
      identical documents/notifications react-query hooks each of the five portal areas needs,
      avoiding five-times duplication. Existing DTOs (`BookingDto`, `LeaseDto`, `PaymentDto`,
      `DocumentDto`, `NotificationDto`, `PurchaseOrderDto`, `MembershipDto`, etc.) and UI primitives
      are reused as-is; only portal-specific response shapes (login/profile, owner-report rows) are
      newly declared in `types/api.ts`.
      Independently verified after the implementing agent's handback: the agent's assigned worktree
      turned out to be on a stale, unrelated branch missing Milestones 7–13 entirely, so its raw diff
      could not be applied directly. The orchestrating session re-derived the exact additive diffs
      for the three modified files (`App.tsx`, `Sidebar.tsx`, `types/api.ts` — confirmed line-by-line
      that no pre-existing line was altered or removed) and applied them by hand onto the real
      branch, then copied the ~40 fully new, self-contained portal/agent-portal files verbatim.
      `npm run build` re-run independently on the real branch and confirmed to exit 0 with zero
      TypeScript errors; grepped for stray string-literal status comparisons (none — every status
      field reuses an existing numeric enum + label map) and for internal `apiClient`/`useAuthStore`
      imports inside `/portal/*` pages (none, confirming the auth-surface separation held; the Agent
      Portal's intentional use of the internal client was the only match). No backend files were
      touched by the frontend work.

## Milestone 14 — SaaS Control Plane + Subscription/Billing Foundation ✅
- [x] Plan model: `SubscriptionPlan` extended (not rebuilt) with `Code`, `Description`,
      `DisplayOrder`, `TrialDays`, `Currency` (ISO 4217 — never assumed to be USD, no
      Pakistan-specific pricing anywhere), `SetupPrice`, `MetadataJson`. Pricing is entirely
      data-driven; zero hardcoded plan-tier checks anywhere in the codebase.
- [x] Entitlement model: a unified `PlanEntitlement`/`TenantEntitlementOverride` (boolean features +
      nullable-long limits) replaces the pre-existing but completely unused `PlanFeature`/
      `TenantFeatureEntitlement` scaffolding (confirmed zero readers anywhere before removing them).
      `EntitlementCodes` is a compile-time catalog, the same pattern `Permissions.cs` already uses —
      no new database catalog table. `ITenantEntitlementService` is the single resolution point
      (override → plan → safe default); a tenant with no plan assigned is always fully unrestricted,
      preserving all 196 pre-Milestone-14 tests with zero changes.
- [x] Runtime enforcement — the audit's own "scaffolding exists but enforcement was incomplete"
      finding is now closed: a new `[RequireEntitlement]` action filter (deliberately not an
      authorization policy, since `PermissionPolicyProvider` already claims every dotted policy name)
      gates `external_portals` (all five External Portal areas), `advanced_reporting` (all 8
      Milestone 12 report controllers), and `facility` (the representative module-gating example);
      five numeric limits (`max_users`, `max_properties`, `max_projects`, `max_portal_users`,
      `max_storage_mb`) are enforced with an efficient `COUNT`/`SUM` check at each entity's own
      creation path. Every violation returns a consistent `{title, status, code}` shape.
- [x] Usage metering: `ITenantUsageService` answers usage/limit/approaching-limit with aggregate
      queries only, no full-table scans — Normal/Approaching(≥80%)/AtLimit is a display hint, never
      itself the enforcement boundary (the exact limit value is).
- [x] Subscription lifecycle: a new `Subscription` aggregate (Trialing/Active/PastDue/Paused/
      Cancelled/Expired), `SubscriptionStatusRules.CanTransition` as the single valid-transition
      source of truth (same convention as `BookingStatusRules`), a filtered partial-unique index
      guaranteeing at most one non-terminal subscription per tenant, and Postgres `xmin` optimistic
      concurrency. `TenantStatus` (Milestone 10) remains the **sole** API-access gate — completely
      unmodified — with `Subscription.Status` feeding into it one-directionally via a documented
      mapping table (`SubscriptionService.MapToTenantStatus`); verified end-to-end by a test that
      cancels a subscription and confirms the tenant's already-issued JWT is immediately rejected by
      the pre-existing, untouched `TenantStatusMiddleware`.
- [x] Background jobs: the first real Hangfire consumer since Hangfire/Redis were provisioned in
      Milestone 9 with zero consumers — an hourly `SubscriptionLifecycleJob` expiring overdue trials,
      idempotent (guarded by `CanTransition` + the `xmin` token) and skipped entirely under the
      "Testing" host so it never runs against the test database mid-suite.
- [x] Billing foundation: `Invoice`/`InvoiceLineItem` (tenant-scoped `InvoiceNumber`, same convention
      as `BookingNumber`/`LeaseNumber` — never a global unique index for a tenant-owned identifier)
      and `BillingPayment` (idempotency-key pattern copied from the three existing payment tables —
      Sales `Payment`, Property `RentPayment`, Facility `FacilityPayment`). `IBillingPaymentProvider`
      is a real, registered extension seam (`UnconfiguredBillingPaymentProvider`, mirrors Milestone
      13's `IPortalPaymentIntentProvider`) for a future Stripe/UAE/GCC gateway — never called by
      anything in this milestone, since recording a payment here means "a platform admin confirmed
      one was already received," not "charge a card." No sensitive payment data of any kind is
      accepted or persisted.
- [x] Production email: `IEmailSender` gained one optional `isHtml` parameter (placed after the
      existing `ct` parameter specifically so every existing positional call site keeps compiling
      unchanged); a new `SmtpEmailSender` (built-in `System.Net.Mail`, no new dependency) is
      registered only when `Smtp:Enabled=true` is explicitly configured — `LoggingEmailSender` stays
      the default everywhere else, including every test (verified by a dedicated test resolving
      `IEmailSender` and asserting its concrete type).
- [x] SaaS admin surface: `PlatformSubscriptionsController` (list, transition) and
      `PlatformInvoicesController` (generate, record payment) alongside extended
      `PlatformOrganizationsController` (subscription/usage/entitlements sub-resources) and
      `PlatformSubscriptionPlansController` (now with entitlements) — every one inheriting the
      pre-existing `PlatformControllerBase`/`SuperAdminOnly` policy, zero new authorization
      mechanism. Tenant-facing `SubscriptionController`/`BillingController` take no tenant/
      subscription/invoice id anywhere — every action reads the ambient tenant, so there is nothing
      for a caller to substitute for another tenant's data — gated by one new tenant-wide permission,
      `subscription.view` (same "one permission spans a cross-cutting foundation" precedent as
      `documents.view`/`reports.view`/`portal.manage_accounts`).
- [x] Database: one migration, `AddSaasControlPlane` — `subscriptions`, `invoices`,
      `invoice_line_items`, `billing_payments`, `plan_entitlements`, `tenant_entitlement_overrides`
      (new tables), `subscription_plans` extended, `plan_features`/`tenant_feature_entitlements`
      dropped (confirmed zero rows anywhere before dropping) — applied and schema-verified against
      both the dev and test databases (see `docs/DATABASE.md`).
- [x] Unit/integration tests: 28 new unit tests (`SubscriptionStatusRules`'s full transition matrix,
      `EntitlementCodes`' catalog integrity) and 14 new integration tests covering plan/entitlement
      CRUD, trial-then-active subscription assignment, double-assignment rejection, invalid-transition
      rejection, cancellation driving `TenantStatus` and blocking further API access, feature-gate
      enforcement (disabled vs. unrestricted-no-plan comparison), both limit-enforcement points
      demonstrated end-to-end (`max_projects`, `max_users`), platform-admin isolation, cross-tenant
      subscription/invoice isolation, payment idempotency with invoice auto-marked Paid, the
      email-sender default, and the background job's trial-expiry transition plus its own
      re-run-is-a-no-op idempotency (with an audit-trail check) — all passing alongside the existing
      suite (238 total: 40 unit + 198 integration), zero regressions in the 196 pre-existing tests.
- [x] Frontend: a SaaS control-plane admin area under `/platform/*` — a SaaS Dashboard (KPIs
      aggregated client-side from the subscriptions/organizations/invoices lists, since no dedicated
      dashboard endpoint exists by design), a Tenant Detail page (`/platform/organizations/:id`, new)
      with Subscription/Usage/Entitlements tabs — the practical home for per-tenant usage and
      entitlement management, since the backend only exposes those per-tenant, not as a cross-tenant
      aggregate — a rewritten Plans page/form (the full Feature/Limit entitlement checklist replacing
      the old `userLimit`/`projectLimit`/`storageLimitMb`/`features` shape end to end, with zero
      stale references left anywhere), a cross-tenant Subscriptions page (with a transition dialog
      offering only the currently-valid next statuses), a Billing/Invoices page (generate + record
      payment, with a fresh client-generated idempotency key per attempt), and a Platform Audit page
      (a two-line wrapper around the existing, already-reusable `AuditLogTable` component). A new
      tenant-facing `/billing` page (plan/status/trial card, usage, enabled features, invoices,
      payment history — no self-service plan change, per this milestone's own scope boundary) is
      reachable from the internal Sidebar for any role holding `subscription.view` (every
      "Organization Owner"/"Organization Admin" automatically). A new `formatCurrency` helper
      (`Intl.NumberFormat` keyed off each record's own `currency` field) replaces the reports
      module's hardcoded `$`-only formatter everywhere in the new billing UI.
      Independently verified after the implementing agent's handback: the agent correctly detected
      its assigned worktree was on a stale, unrelated commit (the same failure mode as the prior
      milestone) and fixed it itself — safely resetting only its own dedicated worktree branch to
      the correct commit before writing any code, exactly as instructed, rather than reconstructing
      anything by hand. Its diff applied cleanly onto the real branch (`git apply --check` passed
      with zero conflicts, since it started from the correct base). `npm run build` re-run
      independently and confirmed to exit 0 with zero TypeScript errors; grepped for the old
      `SubscriptionPlanDto` field names and for stray string-literal status comparisons (zero
      matches for either); every new route cross-checked against `App.tsx` (no dead links, no
      collision with the new `/platform/organizations/:id` route); confirmed the tenant-facing
      billing module correctly imports the internal `apiClient`/`useAuthStore` (not the Milestone 13
      portal ones) since it serves internal ERP tenant admins, not external portal users. No backend
      files, and no Milestone 13 portal files, were touched by the frontend work.

## Notes on scope realism
This is a genuinely large, multi-quarter product (50 functional areas). Each
milestone above ships real, persisted, tested functionality rather than
scaffolding — so later milestones (Construction, Property/Rental, Facility,
SaaS billing) will each take substantial follow-on sessions. The foundation in
Milestone 1 is built so every later module plugs in without rework: tenant
isolation, permission checks, audit logging, validation pipeline, and API/DTO
conventions are established once and reused everywhere.
