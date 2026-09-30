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

## Milestone 15 — SaaS Localization & Tax Engine Foundation ✅
- [x] Localization model: 8 new fields live directly on `Tenant` (`CountryCode`, `Currency`,
      `Locale`, `DateFormat`, `FirstDayOfWeek`, `DefaultLanguage`, `SecondaryLanguages`,
      `MeasurementSystem`), reusing `Timezone` from Milestone 10 rather than duplicating it — the
      tenant itself is the single source of truth, no separate profile table. Neutral defaults
      (`US`/`USD`/`en-US`) mean an existing tenant's behavior is unchanged unless it opts into a
      country. Exposed at `GET/PUT /api/v1/localization/current`, reusing the existing
      `organizations.view`/`organizations.manage` permissions — no new permission needed.
- [x] Country/currency model: `CountryCatalog`/`CurrencyCatalog` — compile-time catalogs (the same
      pattern `Permissions`/`EntitlementCodes` already use), not database tables, since this is
      fixed ISO reference data. Nine countries (UAE, Saudi Arabia, Pakistan, UK, US, Qatar, Bahrain,
      Kuwait, Oman) and ten currencies, each with its own correct decimal precision (BHD/KWD/OMR use
      3, not a hardcoded 2 — `CurrencyCatalog.Round` always reads it).
- [x] Tax engine: new `TaxProfile`/`TaxRate` platform-managed catalog (Super-Admin-only,
      `ITaxProfileService`) plus `ITaxCalculationService` as the single computation point — never a
      hardcoded percentage anywhere. UAE VAT (5% standard, 0% zero-rated) and Saudi VAT (15%
      standard, 0% zero-rated) seeded via `DbSeeder`; every other catalog country deliberately left
      unseeded rather than inventing tax rules for it. Computed tax is snapshotted onto `Invoice`
      (`TaxRateId`/`TaxCode`/`TaxName`/`TaxPercentage`/`TaxInclusive`) at generation time — verified
      by a dedicated test and live that raising a rate's percentage afterward never changes an
      already-issued invoice.
- [x] eInvoice architecture: one generic `IEInvoiceProvider` interface (not one per country) plus
      `EInvoiceSubmission` as the audit trail, exposed at
      `/api/v1/platform/invoices/{id}/einvoice-submissions`. Only `UnconfiguredEInvoiceProvider` is
      registered (mirrors Milestone 14's `UnconfiguredBillingPaymentProvider`) — always fails
      cleanly; no real UAE ASP or Saudi ZATCA/FATOORA integration exists, and none is claimed. Kept
      strictly separate from ordinary PDF invoice generation.
- [x] Saudi rental readiness: 4 nullable columns on `Lease` (`ExternalRegistryProvider`,
      `ExternalContractReference`, `ExternalRegistrationStatus`, `ExternalLastSyncedAt`) as the
      seam a future Ejar (or equivalent) integration would populate — unpopulated by any code this
      milestone; no fake Ejar API call anywhere.
- [x] Exchange rates: `ExchangeRate` (platform-wide) + `IExchangeRateService` — a manual-entry-only
      seam (`SetRateAsync`), never an external FX provider. `ConvertAsync` treats same-currency as
      an always-succeeding identity, derives an exact inverse when only the reverse pair was
      recorded, and fails clearly with `exchange_rate_not_found` rather than inventing a rate when
      neither exists — all three paths covered by tests.
- [x] Finance/currency strategy documented, not over-built: existing Finance/Sales/Property/Facility
      tables gained **no** new currency column, since each tenant now has exactly one operating
      currency (`Tenant.Currency`) and every one of those tables is already tenant-isolated — adding
      a per-row column would just duplicate what `TenantId` already implies. The SaaS billing
      subsystem (`Invoice`/`Subscription`/`BillingPayment`) keeps its own explicit per-row
      `Currency`, correctly, since those rows span many tenants. See `docs/TAX_ENGINE.md`.
- [x] Timezone audit: a full-repository grep for `DateTime.Now`/`DateTime.Today` (the genuinely
      dangerous server-local-time pattern) found **zero matches** — every timestamp already used
      `DateTimeOffset.UtcNow` consistently. The actual gap was UTC-day-boundary assumptions for
      tenant-facing calendar dates; a new `ITenantTimeService` (wrapping a pure, fully-unit-tested
      `TenantClock` helper covering Asia/Dubai, Asia/Riyadh, Asia/Karachi, Europe/London, and
      America/New_York) now drives invoice issue/due dates and every report's default date-range
      resolution, verified live: an invoice generated in the evening UTC correctly shows the next
      calendar day as its issue date for a UAE/Saudi tenant. One narrow, documented limitation
      remains (a few report instant-range filters still use UTC midnight as their day boundary — see
      `docs/LOCALIZATION.md`).
- [x] Reporting: verified that no report can mix currencies, because every report is already
      tenant-scoped and a tenant has exactly one currency — nothing to mix. Confirmed live and by a
      dedicated test generating invoices for a UAE and a Pakistan tenant and checking neither
      currency figure leaks into or gets summed with the other.
- [x] Database: one migration, `AddSaasLocalizationTaxFoundation` — 8 new `tenants` columns
      (with corrected, non-blank default values so existing tenants aren't left with empty-string
      locale settings), 4 new nullable `leases` columns, 5 new nullable `invoices` columns, and 4 new
      tables (`tax_profiles`, `tax_rates`, `exchange_rates`, `tenant_tax_profiles`,
      `einvoice_submissions`) — applied and schema-verified against both the dev and test databases.
- [x] Unit/integration tests: 36 new unit tests (`TenantClock` across all 5 required timezones,
      `CountryCatalog`/`CurrencyCatalog` lookups and currency-precision rounding) and 14 new
      integration tests (country/currency catalogs, tenant localization CRUD with cross-tenant
      isolation, platform tax-profile authorization, UAE 5%/Saudi 15% VAT computed end to end, no
      tax for an unconfigured country, the tax-snapshot-immutability scenario, exchange-rate
      identity/missing-rate/round-trip/inverse behavior, and cross-tenant currency non-mixing) — all
      passing alongside the existing suite (274 total: 62 unit + 212 integration), zero regressions
      in the 238 pre-existing tests.
- [x] Frontend: a dependency-free i18n system (`lib/i18n/` — `en`/`ar` resource dictionaries,
      `I18nProvider`/`useI18n()`, language persisted client-side, `t()` always falls back
      English-then-raw-key so nothing renders blank) wired at the app root in `main.tsx`, with its
      initial language bridged from a new `localizationStore` (zustand, fetch-once from
      `GET /localization/current`, bootstrapped from `AppShell`) so a returning user's tenant
      default language applies automatically until they choose otherwise. Sidebar nav labels
      (`labelKey` replacing every hardcoded `label`, tenant and platform sections alike) and every
      string on the new Settings → Localization page are translated end to end into both languages;
      the rest of the ~100-page app is left for M17 by design. RTL verified functional: `dir`/`lang`
      flip reactively on `<html>`, and the two logical-property fixes the persistent shell actually
      needed (`Sidebar`'s `border-r`→`border-e`, `Topbar`'s notification-badge `-right-0.5`→`-end-0.5`)
      were applied — the rest of the shell already used direction-agnostic flex/gap classes.
      The pre-existing hardcoded `$`/`en-US` `money()` helper (`modules/reports/format.ts`, used by
      every dashboard) now reads the tenant's real currency/locale from `localizationStore`; 8
      dashboard pages found to have their *own* separately-hardcoded `en-US` formatters (Sales,
      Coworking, Mall, Facility, Finance, Procurement, Construction, Property/Rental) were fixed the
      same way. `lib/utils.ts` gained `formatDateTime`/`formatNumber`/`formatPercentage`, and
      `formatCurrency`/`formatDate` now accept an optional locale override, defaulting to the store.
      New pages: Settings → Localization (`/settings/localization` — country/currency/language/
      timezone/date-format/first-day-of-week/measurement-system form with a live preview panel and a
      read-only tax-configuration card, Save gated on `organizations.manage`) and a platform Tax
      Profiles admin page (`/platform/tax-profiles`, Super-Admin-only — list profiles with their
      rates, create a profile, add/edit a rate). `PlatformOrganizationDetailPage` gained a
      Localization tab (view + edit via the platform localization endpoint); the Create Organization
      dialog gained an optional Country select; both invoice detail dialogs now show the tax
      breakdown (e.g. "VAT 5% — 50.00 AED") when a tax snapshot is present, falling back to the
      plain amount otherwise.
      Independently verified after the implementing agent's handback: two earlier attempts landed
      on the wrong branch (a worktree default of `main` rather than this feature branch, an
      environment quirk distinct from — and now confirmed not the same as — the prior milestones'
      stale-worktree failure mode); the corrected delegation instructed the agent to fix its own
      worktree's branch rather than stop, which the third attempt did successfully before writing
      any code. Its finished commit was cherry-picked onto the real branch cleanly. `npm run build`
      was re-run independently and confirmed to exit 0 with zero TypeScript errors; the `money()`
      fix was independently grepped and confirmed (only a doc-comment mention of `$`/`en-US`
      remains); `Sidebar.tsx`, `main.tsx`/`AppShell.tsx`'s provider wiring, and `App.tsx`'s new
      routes were independently read and confirmed to follow this codebase's existing conventions
      exactly (numeric-enum + label-map pattern, `PermissionRoute`/`SuperAdminRoute` guards, no
      stray string-literal comparisons). Honestly flagged by the agent and left as real, scoped gaps
      rather than silently incomplete: the tenant-facing tax-registration (`TenantTaxProfile`)
      PUT is wired in the API hook layer but has no UI yet; the platform Exchange Rates page was not
      built (API hooks only); a platform admin editing a tenant's Localization tab cannot pre-fill
      `dateFormat`/`firstDayOfWeek`/`measurementSystem` with that tenant's actual saved values,
      since no platform endpoint returns another tenant's full `TenantLocalizationDto` (only
      `OrganizationDto`'s four summary fields) — a real, narrow API gap, not a frontend bug. No
      backend files were touched by the frontend work.

## Milestone 16 — AI Business Intelligence / AI Command Center ✅
- [x] AI provider abstraction: `IAiProvider` (`CompleteAsync`) with a minimal 3-variant
      `AiContentBlock` union (Text/ToolUse/ToolResult) as the only shape business logic depends on —
      `AiConversationService` has never seen an Anthropic SDK type. `AnthropicAiProvider` (real,
      configurable via `Ai:Model`/`Ai:MaxOutputTokens`/etc., API key from configuration only, never
      hardcoded) is registered only when `Ai:Enabled=true` and a key is present; `UnconfiguredAiProvider`
      (always fails cleanly) is the default otherwise, mirroring Milestone 14/15's
      `UnconfiguredBillingPaymentProvider`/`UnconfiguredEInvoiceProvider` exactly. One configurable
      provider adapter plus the safe default, per spec — not a multi-provider abstraction.
- [x] Entitlement + permission: `EntitlementCodes.Ai` ("ai") added to the **existing** Milestone 14
      entitlement system (no second gating mechanism); `Permissions.Ai.View` ("ai.view") seeded onto
      every role that already carries `Reports.View`. Disabling the `ai` entitlement blocks only the
      Command Center (`403 feature_not_entitled`) — the rest of the ERP is unaffected.
- [x] Conversation model: `AiConversation`/`AiMessage` (tenant + user scoped; a user can never open
      another user's conversation even within the same tenant). `AiMessage.FactsJson` is populated
      directly from tool execution results by application code, never parsed from the model's own
      text — the concrete hallucination defense: the frontend can always show the real number
      independent of what the assistant's prose claims. No raw provider payloads or secrets stored.
- [x] Business Health (`IBusinessHealthService`, 6 dimensions) and What Needs Attention
      (`IAttentionEngineService`, up to 8 itemized alerts) both reuse **existing Milestone 12
      reporting services exclusively** — no parallel analytics pipeline. Every threshold is a ratio/
      percentage/sign comparison, never a fixed currency amount, so the same rule is meaningful for a
      tenant in AED, PKR, or any other Milestone-15 currency. `HealthStatus` is a 3-value
      Healthy/Attention/Critical enum — never a fabricated numeric score — with pre-formatted
      `Reasons` citing the actual numbers a rule evaluated, generated by the ERP, never the model.
- [x] Tool registry (`IAiToolRegistry`): 14 READ tools wrapping existing reporting/application
      services (executive dashboard, receivables/payables aging, cash position, P&L, sales summary,
      collections, lead funnel, project performance, construction progress, procurement exposure,
      rental performance, maintenance backlog, tenant usage) and 1 WRITE tool
      (`crm.create_follow_up` — deliberately low-risk: no money, no external communication, no
      destructive effect). No arbitrary internal method or database access is exposed; every tool
      re-checks its own `RequiredPermission` against the caller independently at execution time,
      never trusting that a prior turn's or the registry's own filtering already covered it.
      Destructive actions (delete/cancel/refund/close-period/change-subscription/change-tenant-status)
      are not exposed as AI tools at all this milestone.
- [x] Action proposal + approval: a WRITE tool call never executes directly — `AiConversationService`
      always routes it into an `AiActionProposal` instead. **Reuses the existing Milestone 11
      generic Approval Inbox rather than a second approval engine**: `AiActionProposalService.CreateAsync`
      calls the same `IApprovalService.CreateRequestAsync`, and a human decides it through the same
      `POST /api/v1/approvals/{id}/decide` every other approvable module action uses — there is no
      separate "approve an AI action" endpoint. `AiActionProposalApprovalHandler` (an
      `IApprovalLinkedEntityHandler`, the exact extension point Expense/PurchaseOrder/Booking already
      use) drives `ExecuteInternalAsync` on approval. Execution is idempotent (a retried/duplicated
      decision returns the stored result rather than re-running the tool), re-checks the approver's
      own permissions independently, and refuses to execute an expired proposal.
- [x] Audit: every propose/execute/reject and every "Ask Your Business" turn writes to the
      **existing** generic `AuditLog` (Module: "Ai") — a 5th `AiAuditEvent` table was deliberately not
      created, reducing new tables from 5 to 4. Question text is logged truncated to 200 characters;
      full facts/answers and provider secrets are never logged.
- [x] Rate limiting: `IAiRateLimiter` COUNTs `AiUsageRecord` rows in the trailing minute per tenant
      (a real database query, not in-memory state — correct across multiple API instances) against a
      configurable per-tenant limit (default 20/min). Every "Ask" turn, succeeded or failed, writes
      one `AiUsageRecord` (tenant/user/conversation/provider/model/tokens/succeeded/error code).
- [x] API layer: `CommandCenterController` (`GET /api/v1/ai/command-center/summary`),
      `AiConversationsController` (list/get/create conversations, `POST .../messages` for "Ask Your
      Business"), `AiActionProposalsController` (read-only list/get — approval happens on the
      existing Approvals endpoint). All three gated by `[RequireEntitlement("ai")]` +
      `[RequirePermission("ai.view")]`.
- [x] Database: one migration, `AddAiCommandCenterFoundation` — 4 new tables (`ai_conversations`,
      `ai_messages`, `ai_action_proposals` [with Postgres `xmin` optimistic concurrency],
      `ai_usage_records`) — deliberately not 5, since the existing `audit_logs` table already covers
      AI audit needs. Applied and schema-verified against both the dev and test databases.
- [x] Security/hallucination/write-action tests: 13 new integration tests covering tenant isolation
      (another tenant gets 404 on a conversation), user isolation (another user in the same tenant
      gets 404), tool-permission denial even when a scripted model explicitly tries to call an
      unauthorized tool, the fact-vs-narrative hallucination defense (a scripted model narrates a
      fabricated number while `FactsJson` still reflects the tool's real return value), malformed/
      unknown tool calls never crashing or producing facts, the full propose→approve→execute pipeline
      (including idempotent duplicate execution and expiry), reject-never-executes, audit records for
      propose/execute, the entitlement gate blocking only the Command Center while the rest of the
      ERP keeps working, and the `ai_provider_not_configured`/503 path. All passing alongside the
      existing suite (287 total: 62 unit + 225 integration), zero regressions.
- [x] No `ANTHROPIC_API_KEY` exists in this sandbox — honestly disclosed rather than glossed over.
      Every AI-loop test runs against a deterministic `FakeAiProvider` test double
      (`tests/IntegrationTests/Ai/FakeAiProvider.cs`), wired into the integration-test host in place
      of the real provider. `AnthropicAiProvider` compiles cleanly against the real Anthropic SDK but
      has not been, and is not claimed to have been, exercised against a live endpoint.
- [x] Frontend: `/command-center` (gated by the `ai.view` nav permission, `Sparkles` icon placed right
      after Dashboard) renders the Command Center sections as a native page of this ERP — not a
      generic chat clone — in a new `frontend/src/modules/commandCenter/` module:
      `BusinessHealthSection` (the 6 health dimensions as status cards, never re-deriving the ERP's
      own numbers), `AttentionSection` (itemized alerts, best-effort linking to the underlying
      Lead/Customer/WorkPackage/Lease/MaintenanceRequest detail page when a route mapping exists),
      `ConversationPanel` ("Ask Your Business" — conversation list + turn-by-turn history, with a
      `JsonDataView` component rendering an assistant message's `facts` as a visually separate
      structured block from its prose, the concrete frontend form of the fact-vs-narrative defense),
      and `ActionProposalsSection` (pending/decided AI-proposed actions, Approve/Reject reusing the
      **existing** `useDecideApproval` hook from the Milestone 11 Approvals module verbatim — no
      second approve/reject mechanism). Recent AI Insights was deliberately folded into Attention +
      the conversation list rather than built as a fabricated separate feed, since a truly separate
      data source doesn't exist. Three page-level states are handled: normal, entitlement-blocked
      (a single full-page message, not per-section errors), and AI-not-configured (Business
      Health/Attention still render with real data; only the conversational/write-action UI shows an
      unavailable notice). `nav.commandCenter` added to both English and Arabic i18n dictionaries,
      matching Milestone 15's sidebar-translation convention.

      Delegated to a subagent working in an isolated git worktree; independently verified after its
      handback. One process issue surfaced and was corrected: the subagent's worktree forked from
      `origin/claude/real-estate-erp-saas-1q8rd5` **before** this milestone's backend work had been
      committed in the main session, so it correctly built against the real (uncommitted, main-checkout)
      backend contract by reading those files directly rather than guessing, flagged the discrepancy
      explicitly in its handback instead of silently proceeding, and pushed frontend-only commit
      `3f53613` on top of `dc0d9c6`. Because the shared branch ref advanced during that push, the main
      session's own working tree briefly showed spurious staged deletions of the very frontend files
      just pushed; resolved with `git checkout HEAD -- frontend/` (a strict "trust the pushed commit"
      restore, touching only `frontend/`) before this milestone's backend commits were made on top —
      confirmed via `git status` showing a clean, correctly-attributed diff afterward. `npm run build`
      was re-run independently from the main checkout after the restore and confirmed to exit 0 with
      zero TypeScript errors. The subagent's own verification (`npm run lint`, and driving the built
      app with Playwright to confirm `/command-center` redirects to `/login` when unauthenticated with
      zero console errors) could not include authenticated data-flow testing, since its isolated
      worktree had no running backend to call — that gap is closed by this session's own live
      verification below, run from the main checkout against the real API.
- [x] Live verification against the real running API (`dotnet run`, dev database): a fresh tenant
      created and its Command Center summary fetched — real, deterministic `BusinessHealthDto`
      returned (all 6 dimensions correctly `Healthy`/no-data-to-evaluate for a brand-new empty
      tenant) and `aiProviderConfigured: false` (accurately reflecting this sandbox's lack of an
      `ANTHROPIC_API_KEY`); a conversation created and an "Ask" call against it correctly returned
      `503 ai_provider_not_configured` rather than a generic error; a second tenant created, assigned
      a plan with the `ai` feature entitlement explicitly disabled, and confirmed to get `403
      feature_not_entitled` from the Command Center while `GET /api/v1/organizations/me` on that same
      tenant continued to return `200` — proving the entitlement gate blocks only the Command Center,
      never the rest of the ERP; a cross-tenant conversation-access attempt confirmed `404`. This live
      pass surfaced one real, immediately-fixed bug: `BusinessHealthService.SalesAsync` reported
      "Critical" (0% conversion) for a tenant with zero leads, rather than "nothing to evaluate yet"
      — the same no-data pattern Construction/Rental already had. Fixed, rebuilt, and re-verified live
      showing `Healthy`/"No leads this period to evaluate."; the full backend suite was re-run
      afterward (287/287 still passing) to confirm no regression. **Not live-tested, and not
      claimed:** an actual "Ask Your Business" exchange against a real external AI model — this
      sandbox has no `ANTHROPIC_API_KEY`; that behavior is instead covered by the 13 deterministic
      `FakeAiProvider`-backed integration tests exercising the identical `AiConversationService` code
      path (see the "Security/hallucination/write-action tests" bullet above).

## Milestone 17 — Premium UI/UX + Complete Application Polish ✅
- [x] UX audit: inventoried 26 module folders / ~206 `.tsx` files / ~100 routes; found and verified
      (by direct grep, not impression) 12 concrete, high-impact issues — see `docs/UX_AUDIT.md`. The
      two P0 findings with the biggest real-world impact: the entire authenticated app had **zero
      navigation below the `md` breakpoint** (Sidebar was `hidden … md:flex` with no mobile
      replacement at all), and the root `/` landing page was still the literal Milestone-1 placeholder
      dashboard while a real M12 Executive Dashboard existed but was buried under `/reports`.
- [x] Design system: added `Skeleton`/`Switch`/`Tooltip`/`Sheet`/`Command` (shadcn/Radix, no second UI
      framework) plus `StatusBadge`/`StatCard`/`Pagination`/`CommandBar` (`components/common/`).
      `StatCard` was previously hand-copied 11 separate times across module dashboards — now one
      shared component. `StatusBadge` gives every status (Draft/Pending/Approved/.../Suspended) one
      source-of-truth color+text mapping (never color alone) — adopted in 33 files (all customer/
      portal/SaaS-admin-facing surfaces); 43 internal-ERP files still have their own ad-hoc map,
      honestly tracked as follow-up in `docs/UX_AUDIT.md`, not silently dropped. Same partial-but-honest
      pattern for the shared `Pagination` component (23 of ~48 hand-rolled footers migrated).
- [x] Global shell: mobile nav drawer (hamburger → `Sheet` with the identical nav tree) fixes the P0
      mobile-navigation gap; Sidebar regrouped into Home/Command Center/ERP/Reports/Administration
      sections via one shared `navigation.ts` consumed by the desktop sidebar, the mobile drawer, and
      the new command bar alike — permission-filtering logic itself is byte-for-byte unchanged.
- [x] Global command bar: Ctrl+K/Cmd+K palette covering both page navigation (every nav route,
      fuzzy-filterable) and live entity search (leads/customers), with zero dependency on the AI
      provider — pure client-side route matching plus ordinary REST calls. Live-verified: typing
      "balance" navigates to the Balance Sheet; typing "john" surfaces matching leads/customers.
- [x] Root dashboard fix: `/` now shows real KPI cards (sales/collections/profit/cash/receivables/
      occupancy/construction/maintenance) via the existing `useExecutiveDashboard` hook instead of a
      Milestone-1 placeholder — live-verified against a fresh UAE tenant showing real `AED` figures.
- [x] Destructive-action safety: 7 files that mutated data with zero confirmation (including
      `ChartOfAccountsPage`'s account delete) now confirm with entity-specific copy, not a generic
      "Are you sure?"; 2 more (cancelling a construction task/work package) were fixed proactively.
- [x] AI Command Center: light visual polish only (StatusBadge on proposal status, colored health-tile
      stripes) — no structural or data-flow changes to the M16 implementation.
- [x] External portals (Customer/Tenant/Owner/Vendor/Member/Agent) + SaaS admin/billing: StatusBadge/
      StatCard/Pagination adopted throughout; a real currency-formatting bug found and fixed (~44
      hardcoded `$` occurrences across all 6 portals replaced with the tenant-currency-aware `money()`
      helper); vendor/member dashboards gained missing loading/error states; a tenant-portal maintenance
      form's lease dropdown bug (defaulted before leases loaded) was fixed; suspending/cancelling an
      organization now requires confirmation; the tenant Billing page now explains subscription status
      in plain language (trial days left, past due, paused, cancelled, "ends on {date}") with no
      self-service plan-change/payment buttons added (the API doesn't support them — no fake features).
- [x] Portal currency follow-up fix (found during M17, not in the original audit pass): the
      currency-formatting fix above correctly replaced every hardcoded `$`, but portal sessions had no
      route to the tenant's real currency at all — `money()` reads a store only ever populated from the
      staff-only `GET /localization/current`, so every portal amount was silently still USD regardless
      of the tenant's actual currency. Fixed with one small, additive, read-only backend endpoint
      (`GET /api/v1/portal/localization`, portal-auth-only, reusing the existing `ILocalizationService`)
      plus a one-line store bootstrap in `PortalLayout`. Live-verified end to end against a UAE tenant:
      a portal customer's dashboard now correctly shows "AED 0"; the internal staff-only endpoint still
      rejects the portal token (403); the new endpoint rejects unauthenticated (401) and internal-staff
      (403) requests. Full backend suite re-run afterward: 287/287 passing, zero regressions.
- [x] Responsive/RTL/accessibility verification: live Playwright screenshots (not source-only claims)
      at 1440px and 375px, in both English and Arabic, across the dashboard, CRM leads, Finance
      dashboard, Sales bookings, Property dashboard, Facility dashboard, the Executive Report, Command
      Center, Approvals, Chart of Accounts, the mobile nav drawer, the command bar, and the Customer
      portal — zero console/page errors on every page. Arabic RTL confirmed correct: sidebar/drawer on
      the right edge, mirrored table/pagination controls, translated status labels and navigation.
- [x] Security regression review: verified live that authorization is unaffected by the visual
      regrouping — the Sidebar/mobile-drawer/command-bar's shared `navigation.ts` filters on the exact
      same `permission` strings as before; the new portal localization endpoint correctly rejects an
      unauthenticated request (401), an internal staff token (403 via the portal-only policy), and the
      internal staff-only endpoint correctly still rejects a portal token (403) — no cross-boundary leak
      introduced in either direction.
- [x] Backend tests: 287/287 passing (62 unit + 225 integration), zero regressions — the only backend
      change this milestone (`PortalLocalizationController`) is additive and covered by the same live
      verification above rather than a new automated test, since it's a 6-line read-only pass-through
      to an already-tested service.
- [x] Frontend build: `npm run build` exits 0 with zero TypeScript errors (independently re-verified
      after each of the two delegated implementation passes, not just taken on the implementer's word);
      `npm run lint` (oxlint) shows 0 errors, only pre-existing warnings in files this milestone never
      touched.
- [x] Delegated to two sequential background implementation passes (a design-system/shell/dashboard
      pass, then a portals/SaaS-admin/remaining-polish pass depending on the first's primitives), each
      independently verified after handback: the fast-forward-merge artifact seen in M15/M16 (a stale
      working tree briefly showing the just-pushed files as deletions) recurred twice and was resolved
      the same way both times (`git checkout HEAD -- frontend/`) before building on top.

## Notes on scope realism
This is a genuinely large, multi-quarter product (50 functional areas). Each
milestone above ships real, persisted, tested functionality rather than
scaffolding — so later milestones (Construction, Property/Rental, Facility,
SaaS billing) will each take substantial follow-on sessions. The foundation in
Milestone 1 is built so every later module plugs in without rework: tenant
isolation, permission checks, audit logging, validation pipeline, and API/DTO
conventions are established once and reused everywhere.
