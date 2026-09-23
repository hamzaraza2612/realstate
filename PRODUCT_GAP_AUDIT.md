# Product Gap Audit — Milestone 9

**Date:** 2026-09-21 (original audit) · updated 2026-09-21 after Milestone 10 (Security & Finance Hardening)
**Scope:** Full repository audit (backend, frontend, database, docs) against a worldwide-commercial Real Estate ERP/SaaS target, broadly comparable in functional breadth to established real-estate ERP platforms.
**Method:** Direct code/schema/frontend inspection (not documentation review alone). No proprietary third-party code, UI, text, or branding was referenced or copied.
**Baseline:** Milestones 0–8 complete at the time of the original audit. Backend `051fd8c`, frontend `f26ff00`. This document has been updated in place (not rewritten) after Milestone 10 closed several of the P0 items originally found here — sections below are marked accordingly rather than silently rewritten, so the audit trail of what was found vs. later fixed stays visible.

This document is the single source of truth for what is real, what is partial, and what is missing, and it sequences the remaining work by commercial launch risk — not by feature novelty.

---

## 1. Executive Summary

The platform is a genuinely substantial, well-structured multi-tenant ERP covering the full real-estate value chain: CRM → Projects/Inventory → Sales/Booking → Finance → Construction/Procurement → Property/Rental → Facility/Mall/Coworking. Architecture fundamentals are sound: consistent Clean Architecture layering, a real global-tenant-filter multi-tenancy model, permission-based RBAC applied on effectively every endpoint, immutable double-entry journal postings with duplicate-posting protection, a genuine Postgres range-exclusion constraint for coworking booking overlap, and a frontend with consistent typed API/enum conventions, shared state/error/permission components, and no known bugs of the string-enum-comparison class that hit earlier milestones.

It is **not yet commercially launch-ready**, for three independent reasons, each addressed below:

1. **Three compounding, confirmed bugs in role/login handling**, found while writing a single regression test for the first: (a) `AuthService.BuildAuthResultAsync` resolved a login's permissions by matching custom role names across **all tenants** (`IgnoreQueryFilters()` with no `TenantId` re-check) — a cross-tenant privilege leak; (b) a database-level global-unique index (`RoleNameIndex`, on `NormalizedName` alone) meant no two tenants could ever create a role with the same name in the first place, a real SaaS-usability blocker that had also been silently masking how exploitable (a) actually was; and (c) the deepest one — role resolution at login/refresh used `UserManager.GetRolesAsync`, which is itself subject to `AppRole`'s tenant query filter, and since login/refresh run **before** any tenant context exists (they're the endpoints that issue the JWT), that filter collapsed to "system roles only," meaning **any user assigned solely a custom tenant role got zero roles and zero permissions on every login and every refresh** — a plain functional break, invisible until now because every pre-existing test happened to use only seeded system roles (e.g. "Sales Agent"). **All three have been fixed and regression-tested in this milestone** (see §4, §6, §15).
2. **Finance is transaction-capable but not accounting-complete**: ~~no accounts-payable clearing~~, no bank reconciliation, ~~no fiscal-period locking~~, no multi-currency, ~~no formal Balance Sheet/Cash Flow statements~~, no credit/debit notes, and revenue is recognized only on cash receipt. **Updated by Milestone 10**: AP clearing, fiscal-period close/reopen, journal reversal, and Balance Sheet/Profit & Loss/Cash Flow reports are now implemented and tested (see §5 and the Milestone 10 addendum below). Bank reconciliation, multi-currency, and credit/debit notes remain open — fine for recording money movements in a single currency; not yet sufficient for multi-currency operations or formal credit-note-based corrections.
3. **SaaS commercial infrastructure is scaffolded, not functional**: ~~tenant `Status` (Trial/Suspended/Cancelled)~~ and plan limits exist as columns but are never enforced anywhere at runtime; there is no self-service signup, no platform billing/invoicing of tenants, no trial-expiry automation (Hangfire is wired but zero jobs are registered), and no email capability at all (no password reset, no notifications). **Updated by Milestone 10**: `TenantStatus` is now fully enforced — a Suspended/Cancelled tenant can no longer log in, refresh, or use an already-issued token against any protected API. Plan-limit enforcement, self-service signup, trial-expiry automation, platform billing, and email remain open.

None of these are architecture failures — they are scope gaps in modules that were deliberately deferred to later milestones per the existing `ROADMAP.md`. The recommended next milestone (§13) was **Security & Finance Hardening** — that milestone (10) is now complete; see the addendum after §15 for what it closed and what remains.

---

## 2. Current Product Capability Matrix

| Area | Status | Evidence |
|---|---|---|
| CRM / Leads / Customers | **IMPLEMENTED** | `Domain/Crm` (Lead, Customer, Activity), conversion flow, `CrmDashboardController`, full frontend module. |
| Projects / Societies / Town Planning | **IMPLEMENTED** | `Domain/Projects` (Project, ProjectNode self-referencing hierarchy), map anchor fields; no real GIS basemap (see §11). |
| Plot / Unit / Space Inventory | **IMPLEMENTED** | `Domain/Projects/InventoryUnit`, `Domain/Property/PropertyUnit`, `Domain/Facility/Space` — three deliberately distinct unit concepts for three distinct sale/rent/facility contexts (see §4 for whether this is duplication or correct separation). |
| Sales / Booking / Payment Plans | **IMPLEMENTED** | `Domain/Sales` (Booking, PaymentPlan, Installment, Payment), approvals, receipts, `SalesDashboardController`. |
| Accounting / Finance | **PARTIAL** | Real double-entry ledger, trial balance, income summary, immutable postings — but no AP clearing, no reconciliation, no periods, no multi-currency, no full statements. See §5. |
| Construction | **IMPLEMENTED** | `Domain/Construction` (WorkPackage, ConstructionTask, Expense), progress % tracked, dashboard. |
| Procurement / Vendors / Materials | **PARTIAL** | PurchaseRequest→PurchaseOrder→MaterialReceipt flow implemented; disconnected from Finance (no vendor invoice, no AP posting from procurement itself — only Construction Expense posts to Finance). |
| Property / Rental | **IMPLEMENTED** | Property, PropertyUnit, RentalTenant, Lease, RentSchedule, RentPayment, SecurityDeposit, Maintenance — dashboard, full frontend. |
| Facility Management | **IMPLEMENTED** | Facility, Space, UtilityReading, ServiceRequest, FacilityPayment — shared foundation confirmed genuinely reused by Mall/Coworking, not duplicated. |
| Shopping Mall | **IMPLEMENTED** | MallShopProfile (reuses Lease/PropertyUnit), ServiceCharge, Parking, Event, TenantNotice, dashboard. |
| Coworking | **IMPLEMENTED** | Membership, MembershipPlan, Desk, MeetingRoom, Booking (real overlap-prevention via Postgres EXCLUDE constraint), dashboard. |
| Maintenance | **IMPLEMENTED** | `Property.MaintenanceRequest` extended (not duplicated) for Facility reuse; status-rule-governed lifecycle. |
| Documents | **IMPLEMENTED (Milestone 11)** | Generic `Document`/`DocumentVersion` attaches to any entity via `(EntityType, EntityId)` — no per-module table. `IFileStorageService`/`LocalFileStorageService` finally uses the `Storage:LocalPath` config and `uploads-data` volume that had been dead scaffolding since Milestone 1. Size/type/magic-byte validation, versioning, tenant-isolated download, `documents.view`/`documents.manage` permissions. |
| Notifications / Communication | **PARTIAL (Milestone 11)** | In-app `Notification`/`NotificationPreference` and `ICommunicationService`/`IEmailSender` now exist and are used by the Approvals foundation. `LoggingEmailSender` is a development-safe default — **no real SMTP/SendGrid provider is registered yet**, so password reset and any customer-facing email still can't actually leave the building; only the abstraction and its dev-safe implementation exist. |
| Approvals / Workflows | **IMPLEMENTED (Milestone 11)** | Generic `ApprovalRequest` (named approver or "anyone holding permission X"), with Postgres `xmin` optimistic-concurrency protection against duplicate/concurrent decisions. Expense/PurchaseOrder/Booking are integrated *bidirectionally* — deciding via the generic Approval Inbox also drives the entity's own approve/reject, via a pluggable `IApprovalLinkedEntityHandler` registered per module, not a hardcoded dispatch. No other modules integrated yet (deliberately, per scope). |
| Customer / Tenant / Owner / Vendor / Member / Agent portals | **IMPLEMENTED (Milestone 13)** | A new `PortalUser` external-identity table (tenant-scoped email uniqueness, separate from `AppUser`), JWT-based portal login reusing the internal token scheme's claim names, and two-layer authorization isolation (a portal token can never reach an internal endpoint and vice versa). Customer/Tenant/Owner/Vendor/CoworkingMember portals are read-scoped (mostly) views over existing Sales/Property/Procurement/Facility/Documents/Notifications services with per-actor object-ownership checks; the Agent Portal deliberately reuses the existing internal `AppUser` session instead of a new identity, since an agent is already internal staff. See §10. Portal invite/activation email still goes through `LoggingEmailSender` (logged, not delivered) — see the P0 real-email-provider item, now a production-launch gap rather than a portal-blocking one. |
| Reporting / Analytics | **PARTIAL** | Per-module dashboards are real and tenant-scoped; no cross-module reports (project profitability, AP aging, agent performance, today's-sales), no charting despite `recharts` being an installed dependency. See §8. |
| HR / Payroll | **MISSING** | No entity, controller, or domain folder of any kind. |
| Owner / Investor management | **MISSING** | No property-owner or investor entity distinct from `Customer`/`RentalTenant`. No distribution/statement-of-account feature. |
| Agency / Agent management | **PARTIAL** | Sales bookings carry a `SalesAgentUserId`, but agents are plain internal `AppUser`s with a role — no commission tracking, no agent performance report, no external agency/brokerage entity. |
| Marketing / Campaigns | **PARTIAL** | `Lead.Source` exists; no Campaign entity, no spend tracking, no channel-attribution reporting. |
| Maps / Geographic planning | **PARTIAL** | Lat/lng + optional GeoJSON fields exist on Project; frontend renders a dependency-free bounding-box scatter plot, deliberately not a real georeferenced basemap (documented as a known gap in `ARCHITECTURE.md`). |
| SaaS administration | **PARTIAL** | Tenant entity, Super Admin platform controllers, org CRUD, status field all exist — but `TenantStatus` is never enforced at request time (see §4, §9). |
| Subscription / Billing / Plans | **PARTIAL** | `SubscriptionPlan`/`PlanFeature`/`TenantFeatureEntitlement` domain exists as a catalog; no platform invoicing, no payment-gateway integration, no enforcement of `UserLimit`/`ProjectLimit`/`StorageLimitMb` anywhere in code. |
| Usage / Feature entitlements | **PARTIAL** | `TenantFeatureEntitlement` table exists; nothing reads it to gate any feature/module at runtime. |
| Support / Platform administration | **PARTIAL** | Super Admin cross-tenant org list/create/suspend exists; no support-ticket system, no impersonation/support-access mode, no platform-wide audit search UI beyond the raw `PlatformAuditLogsController` list. |

**Should-defer items** (correctly not yet built, per spec's own instruction not to over-build): HR/Payroll, Owner/Investor management, Marketing/Campaigns depth, and a real GIS basemap are all reasonable to leave for a dedicated later milestone — none of the built modules depend on them.

---

## 3. Missing Capabilities (summary list)

~~Documents/attachments~~, a **real** transactional email provider (including password reset — the abstraction and a dev-safe logging default now exist, fixed in Milestone 11, but nothing sends actual mail yet — this is now the reason portal invite/reset emails are logged, not delivered, in production), ~~in-app notifications~~, ~~a generic approval-workflow engine~~, ~~any external-actor portal (customer/owner/tenant/member/vendor/agent)~~, HR/Payroll, Owner/Investor management, platform billing/invoicing of tenants, subscription lifecycle automation, ~~tenant-status enforcement~~, bank reconciliation, ~~fiscal period locking~~, multi-currency, credit/debit notes, ~~AP clearing~~, ~~cross-module reporting (profitability, aging, agent performance)~~, and a real charting layer on the already-present `recharts` dependency (partially addressed — see §12). (Struck-through items were fixed in Milestones 10–13; kept here, not deleted, so this list's history stays legible.)

---

## 4. Domain / Architecture Findings

**Deliberate, justified separations (not duplication):**
- `InventoryUnit` (sale), `PropertyUnit` (rental), `Space` (facility) are three distinct entities for three distinct contexts, bridged where they legitimately overlap (`Space.PropertyUnitId`, `MallShopProfile` sitting on top of `Space`+`PropertyUnit`+`Lease` without re-implementing leasing). This is the correct outcome of the Milestone 8 "do not create three independent systems" mandate and holds up under inspection.
- `Customer` → `RentalTenant` → `CoworkingMember` is a consistent "overlay" pattern (each wraps/extends `Customer` rather than re-modeling a person), applied identically across three milestones.
- `MaintenanceRequest` (Property) vs `ServiceRequest` (Facility) are intentionally different: physical-asset repair vs. generic operational requests, with `ServiceRequest` explicitly reusing `MaintenanceStatus`/`MaintenancePriority` rather than inventing new enums.

**Real technical debt found:**
- **Three parallel payment ledgers** (`Sales.Payment`, `Property.RentPayment`, `Facility.FacilityPayment`), each with its own receipt-numbering scheme, its own idempotency-key column, and its own Finance-posting service (`SalesPaymentPostingService`, `RentalPaymentPostingService`, `FacilityFinancePostingService`). Each was a locally correct "reuse existing X" decision at the time it was built, but the platform now has no single Payment/Receipt concept — a future unified "all money in" report has to union three tables with three different shapes. Not urgent to unify now (would be a large, risky refactor across three modules with 200+ passing tests), but should not grow to a fourth parallel ledger.
- **Four independently-implemented Finance posting services with no shared base**, each re-deriving `EntryNumber` via `_db.JournalEntries.CountAsync()+1` (a race-condition-prone pattern under concurrent load — no DB sequence or advisory lock), each re-doing hardcoded chart-of-accounts lookups, and inconsistently creating `FinancialDocument` receipts (only the Sales path does; Rental/Facility/Construction don't). This is the single highest-leverage refactor candidate in the codebase, but only worth doing once a fifth posting need appears or the entry-number race condition actually causes a collision — see Technical Debt Register.
- **`Booking` name collision** between `Domain.Sales.Booking` (property sale) and `Domain.Facility.Coworking.Booking` (desk/room reservation) required extensive C# type-aliasing across `AppDbContext`, `DependencyInjection`, and EF configurations. Functionally correct and fully resolved, but a naming smell — a future module should not add a third `Booking`.
- **`SecurityDeposit` has no link into Finance at all** (confirmed by the Finance audit, §5) — it is tracked as a standalone status machine with no `JournalEntryId`, meaning deposits held are invisible on any balance sheet.
- **Hangfire and Redis are both fully wired at the infrastructure level (DI, Docker Compose, connection strings) with zero actual consumers** — no recurring job, no `IDistributedCache` usage anywhere. This is pre-built capacity, not dead code to remove, but it means every claim of "background processing" or "caching" in `ARCHITECTURE.md` is aspirational until a real job is registered.
- **No optimistic-concurrency tokens anywhere in the domain model** — every entity relies on EF's default last-write-wins. The three payment idempotency keys solve duplicate-*submission*, not concurrent-*edit*, conflicts (e.g., two staff editing the same `Lease` or `PurchaseOrder` simultaneously silently overwrite each other).
- **Two status-change endpoints skip transition validation entirely**: `FacilityEventService.ChangeStatusAsync` and `TenantNoticeService.ChangeStatusAsync` assign `request.Status` directly with no `CanTransition` check, unlike every other status-bearing entity in the codebase (Space, Membership, Booking, Lease, etc., all go through a `*StatusRules.CanTransition` gate). `ParkingService.EndAsync` uses an ad-hoc single-flag guard instead of the standard rule-table pattern. Low business risk (an event/notice moving to a "wrong" status is not a security or financial issue), but inconsistent with the rest of the codebase's own convention.

No dangerous circular dependencies were found between modules; the module-folder-per-concern layering (`Domain/Application/Infrastructure/<Module>`) has held up across nine domains without any module reaching back into a "later" module's internals.

---

## 5. Finance / Accounting Findings

The ledger itself is well-built: postings are immutable once created (`JournalEntriesController`/`JournalService` only expose Create(Draft)→Post/Cancel, no Update/Edit endpoint exists), every system-generated entry carries a `(TenantId, ReferenceType, ReferenceId)` unique index that hard-blocks duplicate postings at the database level, and audit logging covers every journal lifecycle action. That said, it is a **cash-movement ledger, not a complete accounting system**:

**Confirmed gaps, in order of commercial impact (status after Milestone 10 noted inline):**
1. ~~**No AP clearing**~~ — **Fixed in Milestone 10.** A new `ExpensePayment` entity + `IConstructionFinancePostingService.PostExpensePaymentAsync` (Dr Accounts Payable, Cr Cash) lets an Approved expense be paid down partially or in full, live-verified to zero the AP balance. Still only covers the Construction Expense path (the only place AP was ever credited) — Procurement PO/Receipt still doesn't post to Finance at all (unchanged, separate gap).
2. **Cash-only revenue recognition, no deferred revenue** — unchanged. Every revenue posting (Sales/Rental/Facility) fires at cash receipt, not at invoice/booking time. A multi-year installment sale reports revenue only as cash arrives, not as earned — materially wrong for real-estate developer accounting.
3. **No bank reconciliation and only one hardcoded cash/bank account (`1000`)** — unchanged. `PaymentMethod` is captured on payments but never used to route to different bank accounts; nothing lets an operator reconcile the ledger against an actual bank statement.
4. ~~**No fiscal-period or period-closing mechanism**~~ — **Fixed in Milestone 10.** An opt-in `FiscalPeriod` entity (Open/Closed, non-overlapping per tenant via a Postgres EXCLUDE constraint) is checked by every journal-entry-creation path; a Closed period rejects any post dated into it, live-verified with a 400 on a backdated post and success after reopening. Periods must be explicitly created — a tenant that never defines one sees unrestricted posting exactly as before.
5. ~~**No journal reversal for posted entries**~~ — **Fixed in Milestone 10.** `POST /finance/journal-entries/{id}/reverse` posts a fully swapped-Debit/Credit entry against a Posted one and marks the original `IsReversed`; the original is never edited or deleted, and double-reversal is rejected (enforced at the DB level via the existing duplicate-posting unique index, not just in application code).
6. **No multi-currency** — unchanged, explicitly out of scope for Milestone 10 per its own instructions. Every `Amount` is a bare `decimal`; there is no `Currency` field anywhere in the domain.
7. ~~**Only two report endpoints exist**~~ — **Partially fixed in Milestone 10.** `GET /finance/reports/balance-sheet`, `/profit-and-loss`, and `/cash-flow` now exist alongside Trial Balance/Income Summary, each broken down by account/category with verified reconciliation identities (Assets = Liabilities + Equity + Net Income; Opening + Net Change = Closing Cash). Not yet a period-close-driven formal statement set (no retained-earnings rollup at year-end — Net Income is always computed fresh as of the requested date, not carried forward as a closed balance).
8. **No credit/debit notes** — unchanged. The `FinancialDocumentType` enum defines them but the code that would ever instantiate one does not exist.
9. **No tax engine** — `PurchaseOrder.TaxAmount` is a free-entered number, never posted to a tax account; no tax field exists anywhere else.
10. **No refund/reversal flow for Sales or Rental payments** — only `SecurityDeposit` supports a refund, and even that adjusts the deposit row directly with no journal entry.
11. **No customer-advance mechanism** — `PaymentService.RecordAsync` explicitly rejects any payment exceeding the specific installment's outstanding balance, so a booking-token/advance payment ahead of a formal payment plan cannot be recorded.
12. **Discounts are correctly modeled and validated** (`Booking.Discount`, `PurchaseOrder.Discount`, server-validated against total) but netted into the price pre-posting rather than posted as their own contra-revenue line — acceptable for basic use, not audit-grade.

None of this should be redesigned reactively; §12 sequences it by what a commercial launch actually requires versus what can wait for a genuine multi-entity/multi-currency customer.

---

## 6. Security / Tenancy Findings

**CRITICAL — found and fixed in this milestone (three compounding bugs, all in the login/role path).**

1. `AuthService.BuildAuthResultAsync` resolved a logging-in user's permission set by matching `AppRole.Name` across **all tenants** via `IgnoreQueryFilters()`, with no `TenantId` re-check. If two tenants ever had a custom role with the same name, their `RolePermissions` would be merged together on login — a tenant's staff could silently gain permission codes never granted by their own tenant admin, sourced from an unrelated tenant's identically-named role.
2. The `roles` table still carried ASP.NET Identity's default **global** unique index (`RoleNameIndex`, on `NormalizedName` alone) alongside the intended per-tenant `(TenantId, NormalizedName)` index. The global unique index meant no two tenants could *ever* create a role with the same name — the very first ordinary customer to name a role "Manager" would permanently block every other tenant from doing the same, a real commercial-launch blocker, and one that had also been silently limiting how exploitable bug (1) actually was in practice.
3. The deepest bug, uncovered while writing the regression test for (1)/(2): role resolution at login/refresh used `UserManager.GetRolesAsync(user)`, which is itself subject to `AppRole`'s tenant-scoped EF query filter. Login and refresh are anonymous endpoints that run **before** any tenant context is established (there is no JWT yet — they're what issues it), so the ambient tenant context is `null` during that call, collapsing the filter to "system roles only." **Any user assigned solely a custom (non-system) tenant role therefore received zero roles and zero permissions on every login and every token refresh** — a plain functional break, not just a security nuance. It was invisible until this milestone because every pre-existing test happened to authenticate with a seeded system role (e.g. "Sales Agent", "Organization Owner" — all `TenantId == null` by design), never a genuinely tenant-custom one.

**Fixes:** (1) the permission-merge query is now scoped to `r.TenantId == null || r.TenantId == user.TenantId`; (2) migration `FixRoleNameUniquePerTenant` makes `RoleNameIndex` non-unique and `(TenantId, NormalizedName)` the real unique constraint; (3) `BuildAuthResultAsync` no longer calls `UserManager.GetRolesAsync`, and instead resolves role membership directly via `_db.UserRoles` joined to `_db.Roles` under `IgnoreQueryFilters()`, explicitly re-scoped to the user's own tenant plus system roles. A regression test (`TenantIsolationTests.SameNamedCustomRoleInAnotherTenant_DoesNotLeakItsPermissionsOnLogin`) creates two tenants with an identically-named custom role bearing different permissions, assigns a tenant-B user solely to their tenant's role, and proves that user's login carries their own tenant's permission and never the other tenant's. All 113 integration tests pass with all three fixes in place.

**Everything else audited is solid:**
- Every controller action (all 60+, including every Facility/Mall/Coworking endpoint added in Milestone 8) carries either `[RequirePermission]` or is correctly `[AllowAnonymous]`/gated by `PlatformControllerBase`'s `SuperAdminOnly` policy — no missing-permission-check gaps found.
- No IDOR risk beyond the fixed item above: all other `IgnoreQueryFilters()` call sites (10 total) are legitimate pre-authentication lookups or startup seeders, not request-path data leaks.
- No `PasswordHash` or secret ever appears in a response DTO.
- Audit logging is consistently called from every Facility/Mall/Coworking write service.
- Mass assignment is structurally prevented — `Create*Request` DTOs never expose `Id`/`TenantId`/`CreatedAt`/`Status`.
- No file-upload code exists to have a file-handling vulnerability in (a capability gap, not a security bug — see §3).
- Rate limiting (`AspNetCoreRateLimit`, tighter limits on login/refresh) and Identity account lockout are both correctly wired.
- CORS is fail-closed by default (empty allowed-origins list) and never paired with a wildcard.

**Remaining Medium-severity items (documented, not fixed this milestone — see rationale in §4):**
- No optimistic-concurrency tokens anywhere in the domain (lost-update risk on concurrent edits).
- `FacilityEventService`/`TenantNoticeService` status changes skip transition validation.
- JWT permission claims are baked in at login/refresh — a permission or role revoked mid-session stays valid until the user's token naturally refreshes (standard JWT staleness window, not unique to this system).

---

## 7. Frontend / UX Findings

The frontend is consistent between old and new modules to a degree that is a real strength, not a coincidence — every list page (CRM through Coworking) shares the same table primitives, pagination pattern, filter pattern, `LoadingState`/`ErrorState`/`EmptyState` components, `extractErrorMessage` error handling, `PermissionGate`-based permission-aware UI, and the numeric-const+label-map enum convention with **zero** raw string-literal enum comparisons found anywhere in the codebase (the exact bug class that broke Milestone 6 does not recur).

**Real, reproducible issues found (present in both old and new modules — not a regression introduced by Facility/Mall/Coworking):**
- **Destructive status transitions fire immediately with no confirmation dialog** — "Cancel booking" (Sales), "Cancel" (Coworking booking), and "Cancel" (Maintenance/Service Request) all call their mutation directly on click, while `ConfirmDialog` is correctly used for actual delete actions. This is a genuine UX gap worth closing before launch (cheap, mechanical fix — wrap the existing handlers in the existing `ConfirmDialog`).
- **`recharts` is an installed dependency used by zero files.** All five dashboards (CRM, Sales, Facility, Mall, Coworking) are KPI-card grids with no charts at all — the "Reporting" milestone's charting story has not started despite the library already being present.
- **`StatCard` is copy-pasted verbatim into all five dashboard files** instead of being a shared component — a maintainability nit, not a bug.
- **No shared `DataTable`/`Pagination` component** — every list page (old and new alike) hand-rolls the same ~15-line pagination footer. Works today; will drift if left long enough.
- One old-module wart: `CrmDashboardPage.tsx` keys `leadsByStatus` by the raw C# enum name string rather than the numeric convention used everywhere else (self-documented via an inline code comment) — isolated to CRM, not spread elsewhhere.
- Currency/locale formatting (`Intl.NumberFormat('en-US', ...)` + a literal `$`) is duplicated verbatim across all seven dashboard files with no tenant-level currency/locale setting to source it from — directly caused by the SaaS-readiness gap in §9, not a frontend defect in isolation.

No functional regressions, no permission-bypass paths, and no `any`-typed API handling were found in either generation.

---

## 8. Reporting Findings

**Updated in Milestone 12 — see the addendum below for what shipped.** Original Milestone 9 findings (for history):

| Question | Status at Milestone 9 | Status after Milestone 12 |
|---|---|---|
| Today's sales | **MISSING** | **FIXED** — `GET /reports/executive` (date-ranged) and `/reports/sales/by-period` |
| Outstanding receivables (aging) | **PARTIAL** — no 30/60/90 buckets | **FIXED** — `/reports/sales/receivable-aging`, `/reports/finance/ar-aging` |
| Outstanding payables (vendor aging) | **MISSING** | **FIXED** — `/reports/finance/ap-aging` (built fresh; aged from ExpenseDate, no separate due date exists) |
| Cash collected (today/period) | **MISSING** (all-time only) | **FIXED** — Executive Dashboard Collections KPI, `/reports/finance/collections-trend` |
| Revenue by period | **EXISTING but unreachable** | **FIXED (reachable)** — Executive Dashboard reuses `IFinanceReportService.GetProfitAndLossAsync`; `/reports/finance/revenue-trend` added; a frontend page now calls it |
| Expenses by category/period | **MISSING** | **FIXED** — `/reports/construction/expenses` |
| Project profitability | **MISSING** | **FIXED (direct/gross margin only)** — `/reports/projects/financial-summary`; documented as not allocating overhead, since none is tracked per-project |
| Inventory status | **PARTIAL** — no per-project breakdown | **FIXED** — `/reports/projects/inventory-availability`, `/sold-vs-available` |
| Construction progress | **EXISTING** | Unchanged; extended with `/reports/construction/work-package-progress` (filterable, unpaginated-but-not-"recent"-only) |
| Procurement exposure | **PARTIAL** — no AP tracking | **PARTIALLY FIXED** — `/reports/procurement/purchase-order-exposure` and Construction's AP aging both now exist; a unified AP ledger view spanning both is still future work |
| Rental collection | **EXISTING** | Unchanged; extended with `/reports/property/rent-billed`, `/rent-collected`, `/overdue-rent` |
| Occupancy (rental/mall/coworking) | **EXISTING**, separately | Unchanged; extended with `/reports/property/occupancy` and `/reports/facility/{utilization,mall-occupancy,coworking-desk-utilization}` as standalone filterable reports, not just dashboard fields |
| Mall performance | **PARTIAL** — no footfall tracking | Still no footfall tracking (no backing data model) — everything else extended (`/reports/facility/revenue`, `/parking`, `/events`) |
| Coworking utilization | **EXISTING** | Unchanged; extended with `/reports/facility/meeting-room-utilization` (booked hours) and `/booking-trends` |
| Maintenance backlog | **PARTIAL** — no age/priority breakdown | **FIXED** — `/reports/facility/maintenance-backlog` (age-in-days + priority, scoped to Facility-linked requests) |
| Customer conversion | **EXISTING (basic)** — single rate | **FIXED (staged funnel)** — `/reports/sales/conversion` returns the full Lead-status funnel + rate, date-ranged |
| Sales-agent performance | **MISSING** | **FIXED** — `/reports/sales/by-agent` |

A manager can now answer "what are today's sales," "who owes us money by age," "who do we owe," and
"which project is profitable (directly)" from the new `/reports/*` endpoints — the exact gap this
section originally flagged. See `docs/REPORTING.md` for full KPI definitions and the Milestone 12
addendum below for verification performed.

---

## 9. SaaS Commercial Readiness

The scaffolding is more built-out than a typical Milestone-8-stage product (a `Tenant` entity with `Trial/Active/Suspended/Cancelled` status and `TrialEndsAt`, a `SubscriptionPlan`/`PlanFeature`/`TenantFeatureEntitlement` catalog, `PlatformOrganizationsController` for Super Admin tenant management) — but **none of it is wired to actually govern anything**:

- ~~`TenantStatus.Suspended`/`Cancelled` can be set via `POST /platform/organizations/{id}/status`, but no middleware, filter, or auth check anywhere blocks a suspended tenant's users from continuing to use the API normally.~~ **Fixed in Milestone 10**: login/refresh reject a Suspended/Cancelled tenant outright, and a new `TenantStatusMiddleware` blocks an already-issued token from any protected endpoint the moment its tenant is suspended — live-verified (401 on login, 403 on a previously-valid token, restored on reactivation).
- `UserLimit`/`ProjectLimit`/`StorageLimitMb` on `SubscriptionPlan` are stored but never read by any user/project-creation code path.
- `TenantFeatureEntitlement` rows can be created but nothing checks them before exposing a module/feature.
- No `IHostedService`/background job exists anywhere (Hangfire is wired with zero jobs registered) — `TrialEndsAt` is never checked, so trials never expire automatically.
- No self-service tenant signup — the only tenant-creation path is Super-Admin-driven via the Platform API.
- No platform billing/invoicing of tenants for their own subscription (no Stripe/gateway integration, no Invoice entity at the platform level) — `SubscriptionPlan` is a catalog only.
- ~~No transactional email capability at all~~ **Updated by Milestone 11**: `IEmailSender`/`ICommunicationService` now exist and are used by the Approvals foundation, but the only registered implementation (`LoggingEmailSender`) logs instead of sending — no real SMTP/SendGrid provider is wired in yet, so this still blocks password reset, welcome emails, and any tenant-suspension notice reaching an actual inbox.
- `Tenant.Timezone` is stored and validated but never actually used to convert or display any date/time.
- No currency/locale field anywhere; every frontend dashboard hardcodes `en-US`/`$`.
- Production posture is otherwise genuinely solid: Serilog structured logging, a real `/health` endpoint, fail-closed CORS, environment-variable-driven secrets with no hardcoded defaults in `docker-compose.yml`, a documented Docker Compose deployment procedure, and correctly-scoped rate limiting.

---

## 10. Portal Readiness

**Built in Milestone 13.** A second authentication surface now exists alongside `AuthController`/
ASP.NET Identity: `PortalUser`, a separate table (not a scoped/claims-limited `AppUser`) because
Identity's built-in unique index on `NormalizedUserName` is platform-wide, not per-tenant — the
same real person could otherwise never hold two portal accounts with the same email at two
different tenants. Portal JWTs deliberately reuse the internal token's `sub`/`tenant_id` claim
names, so the EF Core tenant filter and the entire pre-existing `INotificationService` work for
portal sessions unmodified. Full architecture — identity model, JWT claim scheme, the two-layer
authorization-isolation mechanism, per-object ownership checks — is in `docs/PORTAL_ARCHITECTURE.md`.

Five external actor types now have a login and a scoped portal: Customer, RentalTenant,
PropertyOwner (a genuinely new first-class entity — `Property.OwnerName`/`OwnerContact` remain
free-text only), Vendor, and CoworkingMember. The sixth requested portal, Agent, deliberately does
**not** get a new external identity: `Booking.SalesAgentUserId` already references an internal
`AppUser`, so the Agent Portal reuses the caller's existing internal session instead of inventing a
sixth auth surface.

**What remains open:** the `IEmailSender` abstraction (Milestone 11) still has only
`LoggingEmailSender` behind it — portal invite/activation and password-reset links are logged, not
actually delivered to an inbox. Portal login/activation itself works end-to-end in this codebase
(the reset token exists and is checkable via the API regardless of how the email got there), so
this is now a **production-launch gap, not a portal-blocking one** — see the P0 item below. No MFA,
email verification enforcement, magic-link/OTP provider, or native mobile client exists yet
(explicitly out of scope for Milestone 13; `PortalUser.EmailConfirmed` is a placeholder field). No
real payment gateway is wired to the portal payment views (`IPortalPaymentIntentProvider` is a
registered-but-unconfigured extension point) — portals expose existing payment/receipt history
read-only.

---

## 11. Production Readiness

**Solid:** Docker Compose defines all 6 services with correct health-check dependency ordering (`postgres`→`redis`→`api`→`web`→`nginx`), every secret is environment-variable-driven with Compose's `:?required` syntax (no hardcoded defaults), a one-off `migrate` profile exists for controlled migration rollout separate from the self-migrating `api` container, `docker compose config` resolves cleanly with `.env.example` values (confirmed this milestone), structured Serilog logging, a real `/health` endpoint, a global `ExceptionHandlingMiddleware` producing consistent `application/problem+json` responses, and deliberate database indexing (unique tenant-scoped numbers, filtered partial-unique indexes preventing overlapping leases/bookings, idempotency-key uniqueness on all three payment tables).

**Gaps:**
- **No TLS termination anywhere in the stack** (`infra/nginx/reverse-proxy.conf` listens on plain port 80 only) — HTTPS is implicitly assumed to be handled by an external load balancer, which is not documented anywhere in `docs/DEPLOYMENT.md`.
- **Redis is deployed with zero consuming code** — provisioned infrastructure, not a working cache/session store.
- **Hangfire is deployed with zero registered jobs** — provisioned infrastructure, not a working background-job system.
- **No object storage (S3/Blob)** — the `uploads-data` volume and `Storage:LocalPath` config exist with nothing to write to them.
- **No backup/restore automation or documentation** — persistence relies entirely on the raw Postgres data volume.
- **No APM/metrics** (no OpenTelemetry/Prometheus/App Insights) — Serilog console logging only.
- **Full `docker compose up`/`build` could not be exercised in this sandbox** — network policy blocks Docker Hub image pulls (`postgres:16-alpine`, `redis:7-alpine`, `nginx:1.27-alpine`), consistent with every prior milestone's report in this session; `docker compose config` (structural/interpolation validation) passes cleanly.

---

## 12. P0 / P1 / P2 Roadmap

**P0 — required before serious commercial launch** (data-integrity or trust-breaking if absent):
- ~~Cross-tenant role/permission leak~~ — **fixed in Milestone 9.**
- ~~Enforce `TenantStatus`~~ — **fixed in Milestone 10** (Suspended/Cancelled tenants are blocked at login, refresh, and every protected API call).
- A **real** transactional email provider (minimum: password reset, tenant-suspension notice, portal invite/activation) behind the `IEmailSender` abstraction Milestone 11 added. **Abstraction done, portals built on top of it in Milestone 13, real provider still open** — without it, portal invite/reset links are logged, not delivered, which blocks real-world portal adoption even though the underlying login/reset mechanics are complete and tested.
- ~~AP clearing~~ — **fixed in Milestone 10** (vendor payments now reduce the AP balance via `ExpensePayment`).
- ~~Fiscal-period closing~~ — **fixed in Milestone 10** (Closed periods reject backdated postings; opt-in, no behavior change for tenants that don't define one).
- TLS documentation/reverse-proxy guidance for production deployment (even if termination stays external, it must be documented as a hard requirement, not assumed). **Still open.**

**P1 — important shortly after launch:**
- ~~Cross-module reporting~~ — **fixed in Milestone 12** (today's sales, AR/AP aging, cash collected by period, project profitability, sales-agent performance — the Executive Dashboard plus per-module report endpoints under `/reports/*`, see `docs/REPORTING.md`).
- ~~Journal reversal for posted entries~~ — **fixed in Milestone 10.**
- Bank reconciliation and multi-bank-account support (`PaymentMethod` already captured, just not routed).
- ~~Documents/attachments~~ — **fixed in Milestone 11.**
- Confirmation dialogs on destructive status transitions (Cancel booking/membership/request) — cheap, mechanical, closes a real UX gap. (Milestone 11 added confirm-dialogs for its *own* new destructive actions — Approve/Reject in the Approval Inbox, document delete — but the pre-existing Sales/Coworking/Maintenance cancel-button gap this item originally referred to is still open.)
- Subscription lifecycle automation (a single Hangfire recurring job checking `TrialEndsAt`) — the infrastructure to run it already exists and is unused.
- Wire the two Facility/Mall status-change gaps (`FacilityEventService`, `TenantNoticeService`) into the existing `*StatusRules` pattern.
- A real SMTP/SendGrid `IEmailSender` implementation — the interface and a dev-safe default exist as of Milestone 11; only a production provider is missing now.

**P2 — valuable later:**
- ~~Customer/Owner/Tenant/Member/Vendor/Agent portals~~ — **fixed in Milestone 13** (identity
  foundation, all six portals, cross-actor/cross-tenant isolation tests; real-provider email
  delivery for invite/reset links remains a P0 item above).
- Multi-currency.
- Credit/debit notes and a tax engine.
- ~~Charting~~ — **fixed in Milestone 12** (`recharts` now used in the new `/reports/*` pages — trend/breakdown charts only, not on every report; the pre-existing per-module dashboards from Milestones 1–10 still don't use it, which remains open if wanted there too).
- ~~Generic approval-workflow engine~~ — **fixed in Milestone 11** (Expense/PurchaseOrder/Booking integrated; extending to further modules is now a matter of registering another `IApprovalLinkedEntityHandler`, not new architecture).
- Platform billing/invoicing of tenants (Stripe or equivalent) and self-service signup.
- Optimistic-concurrency tokens across the domain model. **Partially addressed in Milestone 11** — `ApprovalRequest` now uses `xmin`; every other entity remains last-write-wins.
- Unify or share a Finance-posting base to remove the four-times-duplicated posting logic (only urgent if a fifth posting need appears, or the `CountAsync()+1` entry-numbering race condition is observed in practice under real concurrent load).
- WhatsApp/SMS/push notification providers — `CommunicationChannel` already names them; no adapter is implemented for any of the three.
- Per-entity-type document permissions (today `documents.view`/`documents.manage` are tenant-wide, not scoped per attached entity type — e.g. a user with `documents.manage` can delete a document attached to any entity, not just ones they'd otherwise have access to).
- Object storage (S3/Blob) provider for Documents, to support horizontal API scaling — `LocalFileStorageService` alone requires either a single API replica or a shared volume across replicas.

**DEFER — not necessary yet:**
- HR/Payroll, Owner/Investor management, Marketing/Campaign depth, real GIS basemap, support-ticket/impersonation tooling, object storage backend (S3/Blob) beyond the local volume already provisioned.

---

## 13. Recommended Next Milestone

**Milestones 10 through 13** are now complete (see their addenda below). The most commonly
requested "can the ERP tell me X" capability gap is closed, and the platform now has a working
external-portal identity foundation with six portal experiences. What remains open per the P0/P1/P2
roadmap above: a real SMTP/SendGrid `IEmailSender` provider (now blocking real-world portal
adoption, not just password reset), TLS/reverse-proxy production deployment documentation, and bank
reconciliation. A real email provider is the natural next small piece of work — it unlocks both
portal invite/reset delivery and tenant-suspension notices in one implementation — followed by
SaaS billing/subscription enforcement, which this session's task explicitly deferred out of
Milestone 13.

---

## 14. Explicitly Deferred Features

HR/Payroll, Owner/Investor management as a distinct entity, deep Marketing/Campaign tracking (spend, channel attribution), a real georeferenced GIS basemap, platform support-ticket/impersonation tooling, and object storage beyond the local Docker volume already provisioned — all correctly out of scope for the current maturity stage and not blocking anything already built.

---

## 15. Technical Debt Register

| Item | Location | Risk if unaddressed | Fixed this milestone? |
|---|---|---|---|
| Cross-tenant role/permission leak via name-only match | `Infrastructure/Services/AuthService.cs` | Privilege escalation within a tenant, sourced from another tenant's identically-named custom role | **Yes** — query now scoped to `TenantId == null \|\| TenantId == user.TenantId`; regression test added (`TenantIsolationTests.SameNamedCustomRoleInAnotherTenant_DoesNotLeakItsPermissionsOnLogin`) |
| Global-unique role-name index blocked any two tenants from sharing a role name | `Infrastructure/Persistence/Configurations/IdentityConfigurations.cs` (`RoleNameIndex`) | First tenant to name a role "Manager" permanently blocks every other tenant from doing the same — a real launch blocker | **Yes** — migration `FixRoleNameUniquePerTenant`; uniqueness moved to `(TenantId, NormalizedName)` |
| Login/refresh resolved roles via a tenant-filtered helper before any tenant context existed | `Infrastructure/Services/AuthService.cs` (`BuildAuthResultAsync`) | Any user assigned only a custom (non-system) role got zero roles/permissions on every login and refresh | **Yes** — role membership now resolved directly via `UserRoles` joined to `Roles` under `IgnoreQueryFilters()`, explicitly re-scoped to the user's tenant + system roles |
| Four independent Finance posting services, no shared base | `Infrastructure/Services/Finance/*PostingService.cs` | Copy-pasted double-entry logic; inconsistent (only Sales creates a `FinancialDocument` receipt) | No — documented, not urgent |
| `EntryNumber` generated via `CountAsync()+1` | Same four services | Race condition under concurrent postings (no DB sequence/lock) | No — documented |
| No optimistic-concurrency tokens anywhere | Entire domain model | Silent last-write-wins on concurrent edits | **Partially** — `ApprovalRequest` uses Postgres `xmin` as of Milestone 11 (the first entity to get one); every other entity remains last-write-wins |
| `FacilityEventService`/`TenantNoticeService` skip status-transition validation | `Infrastructure/Services/Facility/Mall/*.cs` | Illegal status transitions possible (business-integrity, not security) | No — documented |
| Three parallel payment ledgers (Sales/Rental/Facility) | `Domain/Sales/Payment.cs`, `Domain/Property/RentPayment.cs`, `Domain/Facility/FacilityPayment.cs` | No unified "all money in" view without a three-way union query | No — each was locally correct; unify only when a fourth need appears |
| `SecurityDeposit` has no Finance/journal link | `Domain/Property/SecurityDeposit.cs`, `Infrastructure/Services/Property/SecurityDepositService.cs` | Deposits held are invisible on any balance sheet | No — documented, feeds P0 item |
| Hangfire/Redis provisioned, zero consumers | `DependencyInjection.cs`, `docker-compose.yml` | Infra cost with no functional benefit until a job/cache is actually implemented | No — intentional pre-provisioning |
| No shared `DataTable`/`Pagination`/`StatCard` frontend component | `frontend/src/modules/**/*Page.tsx`, dashboard pages | ~15-line pattern copy-pasted across 30+ files; will drift if left long enough | No — documented |
| `recharts` installed, unused | `frontend/package.json` | Dead dependency until Reporting milestone wires it in | No — documented |
| `documents.manage` is tenant-wide, not per-entity-type | `Shared/Security/Permissions.cs` (`Documents`), `Infrastructure/Services/Documents/DocumentService.cs` | A user who can manage documents on their own module's entities can also delete a document attached to any other entity type in the tenant | No — documented, acceptable foundation-scope tradeoff per Milestone 11's own instructions (avoid a per-entity-type permission mapping that would itself be "unmaintainable") |
| `IEmailSender` has only a logging (non-sending) implementation | `Infrastructure/Services/Communication/LoggingEmailSender.cs` | No transactional email actually reaches an inbox — blocks password reset, and now blocks real-world delivery of portal invite/activation links (portals themselves were built on top of this in Milestone 13; the mechanics work, only delivery doesn't) | No — by design; a real provider remains the recommended next small piece of work |
| WhatsApp/Sms/Push channels named but not implemented | `Domain/Communication/CommunicationLog.cs` (`CommunicationChannel`) | Requesting these channels always logs `Skipped` — silent no-op, not a failure, which is correct behavior but easy to forget is a no-op if a future caller assumes otherwise | No — explicitly out of scope for Milestone 11 per its own instructions |

---

## Verification performed in Milestone 9

- **Backend tests:** 12/12 unit + 113/113 integration passed (112 pre-existing + 1 new regression test for the fixed cross-tenant role leak), 0 failures, 0 regressions, with both fixes applied.
- **Frontend build:** `npm run build` — 0 errors (`✓ 2357 modules transformed`).
- **Migration/schema:** one new migration this milestone, `FixRoleNameUniquePerTenant` (moves role-name uniqueness from global to per-tenant) — applied and schema-verified via `psql \d roles` against the dev database; no other schema changes.
- **`docker compose config`:** exits 0 with `.env.example` values.
- **Docker runtime verification:** not exercised — this sandbox's network policy blocks Docker Hub image pulls, consistent with every prior milestone's report.
- **Fix scope:** two production files changed (`AuthService.cs` — role resolution in `BuildAuthResultAsync` rewritten to be tenant-safe; `IdentityConfigurations.cs` — index definition) plus one migration (`FixRoleNameUniquePerTenant`) and one new regression test (`TenantIsolationTests.cs`) — no architecture change, no new module.

---

## Milestone 10 addendum — Security & Finance Hardening

Milestone 10 closed six of the items this audit originally flagged (see the strikethrough markers throughout §5, §9, §12): tenant-status enforcement, AP clearing, fiscal-period close/reopen, journal reversal, and Balance Sheet/Profit & Loss/Cash Flow reports. It also re-ran an authorization pass against every finding in §6 and found no new defects.

**What was implemented:**
- `TenantStatusMiddleware` (per-request enforcement of already-issued tokens) plus `AuthService.LoginAsync`/`RefreshAsync` checks (enforcement at the point of issuance) — both share one `TenantStatusExtensions.IsUsable()` helper so the two enforcement points can never drift out of sync.
- `FiscalPeriod` (opt-in, non-overlapping via a Postgres EXCLUDE constraint) + `FiscalPeriodGuard`, called from all five journal-entry-creation paths (manual + four system posting services).
- `JournalService.ReverseAsync` — a new, fully swapped entry against a Posted one; the original is never mutated.
- `ExpensePayment` (AP clearing) — mirrors the existing `RentPayment`/`FacilityPayment` source-row-per-posting convention exactly, including the idempotency-key and retry-on-`23505` patterns.
- `GetBalanceSheetAsync`/`GetProfitAndLossAsync`/`GetCashFlowAsync` on the existing `FinanceReportService`, alongside (not replacing) Trial Balance/Income Summary.

**What was deliberately not touched, per the milestone's own scope:** multi-currency, a tax engine, credit/debit notes, bank reconciliation, the older Sales/Coworking/Maintenance missing-confirm-dialog UX gap, and the `FacilityEventService`/`TenantNoticeService` status-transition gaps — all remain open and are now scheduled into Milestones 11–15 in `ROADMAP.md` rather than this one.

### Verification performed in Milestone 10

- **Backend tests:** 12/12 unit + 129/129 integration passed (113 pre-existing + 16 new), 0 failures, 0 regressions.
- **Frontend build:** `npm run build` — 0 errors.
- **Migration/schema:** one new migration, `AddSecurityFinanceHardening` (`JournalEntry.IsReversed`/`ReversalOfEntryId`, `Expense.PaidAmount`, new `expense_payments` and `fiscal_periods` tables including a Postgres EXCLUDE constraint on `fiscal_periods` for tenant-scoped non-overlap) — applied and schema-verified via `psql \d` against the dev database.
- **`docker compose config`:** exits 0 with `.env.example` values.
- **Docker runtime verification:** not exercised — this sandbox's network policy still blocks Docker Hub image pulls, unchanged from every prior milestone's report.
- **Live verification against the real running API:** suspend → login blocked (401) → an already-issued token blocked on a protected endpoint (403) → reactivate → login restored; fiscal period created → closed → backdated post rejected (400) → reopened → retry succeeds (201); journal entry posted → reversed (debit/credit swap confirmed line-by-line) → double-reversal rejected (400); expense created → approved → paid in full via AP clearing; Balance Sheet (`TotalAssets == TotalLiabilitiesAndEquity`), Profit & Loss, and Cash Flow (`OpeningCash + NetChange == ClosingCash`) all fetched and their reconciliation identities held exactly on real, non-trivial numbers.
- **Fix scope:** ~15 backend files (2 new entities, 1 new service, 1 new middleware, 1 new controller, extensions to `AuthService`/`JournalService`/`ConstructionFinancePostingService`/`ExpenseService`/`FinanceReportService`/the three other posting services), 1 migration, 3 new/extended test files — additive throughout, no existing endpoint's request/response shape was changed, no existing test was modified.

---

## Milestone 11 addendum — Documents + Notifications + Approvals + Communication Foundation

Milestone 11 closed three of this audit's originally-flagged Missing Capabilities (§3): Documents, in-app Notifications, and a generic Approval workflow. It also added — not fixed, since nothing was broken — a fourth foundation piece the audit didn't originally call out by name: a provider-agnostic Communication abstraction, which the other three needed anyway.

**What was implemented:**
- `Document`/`DocumentVersion`, addressed by `(EntityType, EntityId)` — no per-module document table. `IFileStorageService`/`LocalFileStorageService` finally puts the `Storage:LocalPath` config and `uploads-data` Docker volume (both provisioned since Milestone 1, dead until now) to use. Size/allow-listed-type/magic-byte validation, real immutable versioning, tenant-isolated download.
- `Notification`/`NotificationPreference`, scoped to `(TenantId, UserId)`, no permission gate needed since every action is already scoped to the caller.
- `ICommunicationService`/`IEmailSender` — the single entry point every module calls to notify a user, with `LoggingEmailSender` as the zero-dependency development default and a `CommunicationLog` row written per channel attempted regardless of outcome.
- `ApprovalRequest`, the first entity in this domain model to carry a real optimistic-concurrency token (Postgres `xmin`) rather than relying solely on an application-level status check — directly closing part of a Milestone 9 technical-debt item. Expense/PurchaseOrder/Booking are integrated bidirectionally via a pluggable `IApprovalLinkedEntityHandler` per module, resolved lazily through `IServiceProvider` specifically to avoid a circular DI dependency the naive design would have created (`ApprovalService → ExpenseApprovalHandler → IExpenseService → ApprovalService`) — found and fixed during this milestone, not anticipated in the original design.

**A second cross-tenant leak of the same shape as Milestone 9's was found and fixed during this milestone**, before it ever shipped: `ApprovalService.GetUsersWithPermissionAsync` (notifying "anyone holding permission X" about a new approval request) initially matched `RolePermissions`/`UserRoles` by `RoleId` alone with no tenant check — since a shared system role (`TenantId` null) is a single row assigned to users across every tenant that uses it, this would have notified other tenants' staff about a request that has nothing to do with them. Fixed before any test or live verification ran by explicitly re-joining to `Users` filtered by the current tenant.

**What was deliberately not touched, per the milestone's own scope:** a real SMTP/SendGrid `IEmailSender` provider, WhatsApp/SMS/push adapters, per-entity-type document permissions, self-service/manual approval-request creation UI, and integrating Approvals/Documents into any module beyond the three (Expense/PurchaseOrder/Booking) and three (Customer/Booking/PurchaseOrder detail pages) named — all remain open, tracked in §12/§15 above.

### Verification performed in Milestone 11

- **Backend tests:** 12/12 unit + 150/150 integration passed (129 pre-existing + 21 new), 0 failures, 0 regressions.
- **Frontend build:** `npm run build` exits 0 with zero TypeScript errors (independently re-run after the implementing agent's handback, not just taken on its word). Delivered: `DocumentsPanel` (upload/version-history/download/delete, permission-gated) on Customer/Booking/Purchase Order detail pages plus a standalone `/documents` browser; a Notification Bell in the Topbar (unread badge, 30s poll, mark-read/mark-all-read, deep links) plus `/notifications` and `/notifications/preferences` pages; an `/approvals` inbox and an `ApprovalHistoryCard` on Booking/Purchase Order detail pages. Independent spot-check confirmed every route, query-param name, DTO field name, and permission code matches the actual controllers/DTOs (`DocumentsController`, `NotificationsController`, `ApprovalsController`), the numeric-enum + label-map convention is followed with no stray string-literal status comparisons, and no backend files were touched.
- **Migration/schema:** one new migration, `AddDocumentsNotificationsApprovalsCommunication` (`documents`, `document_versions`, `notifications`, `notification_preferences`, `communication_logs`, `approval_requests` — the last with a Postgres `xmin` optimistic-concurrency token) — applied and schema-verified via `psql \d` against the dev database.
- **`docker compose config`:** exits 0 with `.env.example` values.
- **Docker runtime verification:** not exercised — this sandbox's network policy still blocks Docker Hub image pulls, unchanged from every prior milestone's report.
- **Live verification against the real running API:** a PDF uploaded, downloaded back byte-for-byte identical, a second version added, then deleted and confirmed unretrievable (404); an Expense created (auto-creating its ApprovalRequest), decided via the generic Approval Inbox, and the Expense's own status confirmed Approved (proving the bidirectional dispatch, not just the module-to-approval direction already covered by tests); unread-notification count and communication-log entries (2 in-app + 2 email, both Sent) confirmed for the same flow.
- **Fix scope:** ~20 new backend files across 4 new domains (Documents/Notifications/Approvals/Communication), 3 existing services extended with approval hooks (`ExpenseService`, `PurchaseOrderService`, `BookingService`), 1 migration, 3 new/extended test files — additive throughout, no existing endpoint's request/response shape changed, no existing test modified.

## Milestone 12 addendum — Cross-Module Reporting & Analytics

A unified, read-only reporting layer over existing modules' data closing the exact gap §8 originally flagged: a manager can now answer "what are today's sales," "who owes us money by age," "who do we owe," "which project is profitable (directly)," and "how utilized is a given desk/shop/facility" from the new `/reports/*` endpoints. Nothing here is a second business module — every report either aggregates existing tables directly or calls straight into another module's already-implemented service (Finance's P&L/Cash Flow, Property's occupancy, CRM's conversion rate) rather than recomputing a second, possibly-diverging version of the same number.

**What was implemented:** an Executive Dashboard (16 KPIs, each documented as either a period sum or an as-of-now snapshot); Sales reports (by-project/-period/-agent, booking-status, conversion funnel, cancellations, collections, outstanding-installments delegated to the existing Receivables service, and a new receivable-aging report); Finance extensions (AR aging, AP aging built fresh, revenue/expense/collections trend series — Trial Balance/P&L/Balance Sheet/Cash Flow deliberately left at their existing routes); Project reports (inventory availability, sold-vs-available, sales/collection summaries, a direct-margin project-profitability report, and progress); Construction/Procurement reports (work-package progress, expenses by category, budget-vs-actual against the real `WorkPackage.Budget` field, PO exposure, received-vs-ordered, vendor spend, PO status); Property/Rental reports (occupancy, rent billed/collected, overdue rent, revenue, tenant aging, lease status); Facility/Mall/Coworking reports (utilization, mall occupancy, service-charge collection, revenue resolved through each payment's polymorphic source reference, parking, events, desk/meeting-room utilization, booking trends, and a Facility-scoped maintenance backlog). Full KPI definitions are in the new `docs/REPORTING.md`.

**What was deliberately not fabricated:** no AR/AP aging existed before this milestone in a bucketed form (built fresh, not faked); no budget field exists on `Project` or `ConstructionTask`, so no budget-vs-actual report was offered at those levels (only the real `WorkPackage.Budget` figure is reported); mall footfall tracking has no backing data model and remains unreported; project profitability is explicitly documented as a direct/gross margin (sales revenue minus direct construction expense), not a full P&L, since no per-project overhead allocation is tracked anywhere in the domain.

**Architecture:** one tenant-wide `reports.view` permission gates every report controller (the same precedent as `documents.view`/`approvals.view`); `ReportDateRange`/`AgingBucket` are the single shared definitions every report reuses so "this month" and "31-60 days" mean the same thing everywhere; `IReportExporter`/`CsvReportExporter` implement CSV now with Excel/PDF as a clean, unimplemented extension point — no dependency added for a format not yet built. Every report row carries the referenced entity's real id for drill-down, and a dedicated test confirms holding `reports.view` never grants implicit access to what a drill-down link points at.

### Verification performed in Milestone 12

- **Backend tests:** 12/12 unit + 170/170 integration passed (150 pre-existing + 20 new), 0 failures, 0 regressions.
- **Frontend build:** `npm run build` exits 0 with zero TypeScript errors (independently re-run after the implementing agent's handback). Delivered: an Executive Dashboard (13 grouped KPI cards) plus 7 tabbed report pages under `/reports/*` covering every backend report endpoint, gated by `reports.view`; 6 `recharts` charts (its first real use in this codebase, resolving the P2 "wire the already-installed recharts dependency" item — see §12); CSV export buttons wherever the backend supports `?format=csv`. Independent spot-check confirmed every new DTO in `types/api.ts` matches the actual backend response shapes field-by-field, every drill-down link resolves to a real existing route in `App.tsx`, and no stray string-literal enum comparisons exist. No backend files were touched.
- **Migration/schema:** one new migration, `AddReportingIndexes` (8 composite indexes across `bookings`/`payments`/`expenses`/`rent_payments`/`purchase_orders`/`facility_payments`/`service_charge_charges`/`maintenance_requests`, no new tables) — applied and schema-verified via `psql \d` against the dev database.
- **`docker compose config`:** exits 0 with `.env.example` values (both the default profile and `--profile tools`).
- **Docker runtime verification:** not exercised — this sandbox's network policy still blocks Docker Hub image pulls, unchanged from every prior milestone's report.
- **Query/performance verification:** every report is a direct EF Core LINQ query with server-side `GroupBy`/`Sum`/`Count` and DTO-shaped projections — no full-entity-graph loads; new indexes were added only where a report's own filter predicate justified one (see `docs/DATABASE.md`), not speculatively.
- **Live verification against the real running API, with two real tenants:** Customer → Booking → Payment Plan → Payment → Executive Dashboard, cross-checked field-for-field against Finance's own Profit & Loss and Cash Flow for the identical period (exact reconciliation: Sales 500,000, Collections/Revenue 200,000, Receivables 300,000, Profit 200,000, Cash Position matching Cash Flow's ClosingCash); Property → Unit → Tenant → Lease → Rent Schedule → Rent Payment → Property occupancy (100%) and rent-collected (exact payment amount) reports; a second tenant confirmed to see zero rows/zero totals across Sales, Finance, and Property reports for the first tenant's data.
- **Fix scope:** ~30 new backend files (Application DTOs/interfaces + Infrastructure services + 8 report controllers, all under a new `Reporting` namespace), 8 existing entity configurations extended with one justified index each, 1 migration, 1 new test file (20 tests) — fully additive, no existing endpoint's request/response shape changed, no existing test modified.
