# Product Gap Audit — Milestone 9

**Date:** 2026-09-21
**Scope:** Full repository audit (backend, frontend, database, docs) against a worldwide-commercial Real Estate ERP/SaaS target, broadly comparable in functional breadth to established real-estate ERP platforms.
**Method:** Direct code/schema/frontend inspection (not documentation review alone). No proprietary third-party code, UI, text, or branding was referenced or copied.
**Baseline:** Milestones 0–8 complete. Backend `051fd8c`, frontend `f26ff00`.

This document is the single source of truth for what is real, what is partial, and what is missing, and it sequences the remaining work by commercial launch risk — not by feature novelty.

---

## 1. Executive Summary

The platform is a genuinely substantial, well-structured multi-tenant ERP covering the full real-estate value chain: CRM → Projects/Inventory → Sales/Booking → Finance → Construction/Procurement → Property/Rental → Facility/Mall/Coworking. Architecture fundamentals are sound: consistent Clean Architecture layering, a real global-tenant-filter multi-tenancy model, permission-based RBAC applied on effectively every endpoint, immutable double-entry journal postings with duplicate-posting protection, a genuine Postgres range-exclusion constraint for coworking booking overlap, and a frontend with consistent typed API/enum conventions, shared state/error/permission components, and no known bugs of the string-enum-comparison class that hit earlier milestones.

It is **not yet commercially launch-ready**, for three independent reasons, each addressed below:

1. **Three compounding, confirmed bugs in role/login handling**, found while writing a single regression test for the first: (a) `AuthService.BuildAuthResultAsync` resolved a login's permissions by matching custom role names across **all tenants** (`IgnoreQueryFilters()` with no `TenantId` re-check) — a cross-tenant privilege leak; (b) a database-level global-unique index (`RoleNameIndex`, on `NormalizedName` alone) meant no two tenants could ever create a role with the same name in the first place, a real SaaS-usability blocker that had also been silently masking how exploitable (a) actually was; and (c) the deepest one — role resolution at login/refresh used `UserManager.GetRolesAsync`, which is itself subject to `AppRole`'s tenant query filter, and since login/refresh run **before** any tenant context exists (they're the endpoints that issue the JWT), that filter collapsed to "system roles only," meaning **any user assigned solely a custom tenant role got zero roles and zero permissions on every login and every refresh** — a plain functional break, invisible until now because every pre-existing test happened to use only seeded system roles (e.g. "Sales Agent"). **All three have been fixed and regression-tested in this milestone** (see §4, §6, §15).
2. **Finance is transaction-capable but not accounting-complete**: no accounts-payable clearing, no bank reconciliation, no fiscal-period locking, no multi-currency, no formal Balance Sheet/Cash Flow statements, no credit/debit notes, and revenue is recognized only on cash receipt. Fine for recording money movements; not sufficient for audited financial statements or investor/lender due diligence.
3. **SaaS commercial infrastructure is scaffolded, not functional**: tenant `Status` (Trial/Suspended/Cancelled) and plan limits exist as columns but are never enforced anywhere at runtime; there is no self-service signup, no platform billing/invoicing of tenants, no trial-expiry automation (Hangfire is wired but zero jobs are registered), and no email capability at all (no password reset, no notifications).

None of these are architecture failures — they are scope gaps in modules that were deliberately deferred to later milestones per the existing `ROADMAP.md`. The recommended next milestone (§13) is **Security & Finance Hardening**, not a new feature module, because the two hardest-to-retrofit gaps (accounting integrity and tenant-status enforcement) compound with every module built on top of them.

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
| Documents | **MISSING** | No `IFormFile`/upload/attachment code anywhere. A `Storage:LocalPath` config key and an `uploads-data` Docker volume exist but are unused — dead scaffolding, not a feature. |
| Notifications / Communication | **MISSING** | No notification entity, no email service (`SmtpClient`/`SendGrid`/`MailKit` — zero hits), no in-app notification feed. Password reset does not exist because there is no email capability to deliver it. |
| Approvals / Workflows | **PARTIAL** | Approval exists as a hardcoded step inside specific flows (Sales Booking approval, Expense approval) — no generic, reusable approval-workflow engine. |
| Customer / Tenant / Member portals | **MISSING** | Confirmed zero external-actor login surface. `Customer`, `RentalTenant`, `Vendor` have no password/credential/UserId field at all — only ERP staff and Super Admin can authenticate. See §10. |
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

Documents/attachments, transactional email (including password reset), in-app notifications, a generic approval-workflow engine, any external-actor portal (customer/owner/tenant/member/vendor/agent), HR/Payroll, Owner/Investor management, platform billing/invoicing of tenants, subscription lifecycle automation, tenant-status enforcement, bank reconciliation, fiscal period locking, multi-currency, credit/debit notes, AP clearing, cross-module reporting (profitability, aging, agent performance), and a real charting layer on the already-present `recharts` dependency.

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

**Confirmed gaps, in order of commercial impact:**
1. **No AP clearing** — Accounts Payable (2200) is only ever credited (Construction Expense approval); nothing in the codebase ever debits it. Vendor payables can be recorded but never paid off in the GL.
2. **Cash-only revenue recognition, no deferred revenue** — every revenue posting (Sales/Rental/Facility) fires at cash receipt, not at invoice/booking time. A multi-year installment sale reports revenue only as cash arrives, not as earned — materially wrong for real-estate developer accounting.
3. **No bank reconciliation and only one hardcoded cash/bank account (`1000`)** — `PaymentMethod` is captured on payments but never used to route to different bank accounts; nothing lets an operator reconcile the ledger against an actual bank statement.
4. **No fiscal-period or period-closing mechanism** — any journal entry can be backdated into any prior period indefinitely; there is no way to lock a closed month/year.
5. **No journal reversal for posted entries** — only Draft entries can be cancelled; correcting a posted error requires a brand-new, system-unlinked manual offsetting entry.
6. **No multi-currency** — every `Amount` is a bare `decimal`; there is no `Currency` field anywhere in the domain.
7. **Only two report endpoints exist** — Trial Balance and a basic Income Summary (Revenue − Expenses, no line items). No Balance Sheet endpoint (despite the dashboard already computing Assets/Liabilities/Equity internally — it's just not exposed as a report), no Cash Flow Statement.
8. **No credit/debit notes** — the `FinancialDocumentType` enum defines them but the code that would ever instantiate one does not exist.
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

| Question | Status |
|---|---|
| Today's sales | **MISSING** |
| Outstanding receivables (aging) | **PARTIAL** — per-installment outstanding + overdue flag; no 30/60/90 buckets |
| Outstanding payables (vendor aging) | **MISSING** |
| Cash collected (today/period) | **MISSING** (dashboard total is all-time only) |
| Revenue by period | **EXISTING but unreachable** — `FinanceReportsController.IncomeSummary` exists; no frontend page calls it |
| Expenses by category/period | **MISSING** |
| Project profitability | **MISSING** |
| Inventory status | **PARTIAL** — global counts exist; no per-project breakdown |
| Construction progress | **EXISTING** — `ConstructionDashboardController` |
| Procurement exposure | **PARTIAL** — open-PO value exists; pending-vendor-payments doesn't (no AP tracking) |
| Rental collection | **EXISTING** — `RentalDashboardController` |
| Occupancy (rental/mall/coworking) | **EXISTING**, all three, separately |
| Mall performance | **PARTIAL** — revenue/occupancy/event-count exist; no footfall tracking |
| Coworking utilization | **EXISTING** |
| Maintenance backlog | **PARTIAL** — open count only; no age/priority breakdown |
| Customer conversion | **EXISTING (basic)** — single conversion-rate metric, not a staged funnel |
| Sales-agent performance | **MISSING** |

Per-module dashboards are genuinely tenant-scoped and real (not mocked), but a manager cannot today answer "what are today's sales," "who owes us money by age," "who do we owe," or "which project is profitable" from any existing screen or endpoint.

---

## 9. SaaS Commercial Readiness

The scaffolding is more built-out than a typical Milestone-8-stage product (a `Tenant` entity with `Trial/Active/Suspended/Cancelled` status and `TrialEndsAt`, a `SubscriptionPlan`/`PlanFeature`/`TenantFeatureEntitlement` catalog, `PlatformOrganizationsController` for Super Admin tenant management) — but **none of it is wired to actually govern anything**:

- `TenantStatus.Suspended`/`Cancelled` can be set via `POST /platform/organizations/{id}/status`, but no middleware, filter, or auth check anywhere blocks a suspended tenant's users from continuing to use the API normally.
- `UserLimit`/`ProjectLimit`/`StorageLimitMb` on `SubscriptionPlan` are stored but never read by any user/project-creation code path.
- `TenantFeatureEntitlement` rows can be created but nothing checks them before exposing a module/feature.
- No `IHostedService`/background job exists anywhere (Hangfire is wired with zero jobs registered) — `TrialEndsAt` is never checked, so trials never expire automatically.
- No self-service tenant signup — the only tenant-creation path is Super-Admin-driven via the Platform API.
- No platform billing/invoicing of tenants for their own subscription (no Stripe/gateway integration, no Invoice entity at the platform level) — `SubscriptionPlan` is a catalog only.
- No transactional email capability at all (no SMTP/SendGrid/MailKit) — this alone blocks password reset, welcome emails, and any tenant-suspension notice.
- `Tenant.Timezone` is stored and validated but never actually used to convert or display any date/time.
- No currency/locale field anywhere; every frontend dashboard hardcodes `en-US`/`$`.
- Production posture is otherwise genuinely solid: Serilog structured logging, a real `/health` endpoint, fail-closed CORS, environment-variable-driven secrets with no hardcoded defaults in `docker-compose.yml`, a documented Docker Compose deployment procedure, and correctly-scoped rate limiting.

---

## 10. Portal Readiness

There is exactly one authentication surface in the entire system (`AuthController` + ASP.NET Identity), used by internal staff and Super Admin only. `Customer`, `RentalTenant`, `Vendor`, and the newly-added `CoworkingMember` have **no password, credential, or `UserId` field of any kind** — confirmed by direct inspection of all four entities. Building any of the six requested portals (Customer, Owner, Tenant, Rental, Member, Vendor, Agent) requires, at minimum: an external-identity concept distinct from `AppUser` (or a scoped/claims-limited `AppUser` linked to a `Customer`/`RentalTenant`/`Vendor` row), a separate login surface, and read-scoped (mostly) API views onto data that already exists and is already correctly tenant-isolated. The domain services underneath are reusable as-is; only the identity/auth layer and a thin portal-specific frontend are net-new work. This is real, well-scoped work — not a rebuild — but it has a hard prerequisite that doesn't exist yet: email delivery, since a portal invite/password-reset flow is meaningless without it.

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
- ~~Cross-tenant role/permission leak~~ — **fixed in this milestone.**
- Enforce `TenantStatus` (Suspended/Cancelled tenants must be blocked at the API boundary, not just flaggable in the DB).
- Transactional email capability (minimum: password reset, tenant-suspension notice) — this is also the hard prerequisite for any portal work.
- AP clearing (vendor payments must be able to reduce the AP balance — right now it only ever grows).
- Fiscal-period closing (prevent silent backdated postings into a closed period) — required for any customer who will be audited.
- TLS documentation/reverse-proxy guidance for production deployment (even if termination stays external, it must be documented as a hard requirement, not assumed).

**P1 — important shortly after launch:**
- Cross-module reporting: today's sales, AR/AP aging, cash collected by period, project profitability, sales-agent performance — the single most commonly asked "can the ERP tell me X" questions today's answer is no to.
- Journal reversal for posted entries (not just Draft cancellation).
- Bank reconciliation and multi-bank-account support (`PaymentMethod` already captured, just not routed).
- Documents/attachments (leases, maintenance photos, KYC) — infra (`uploads-data` volume, `Storage:LocalPath`) is already provisioned.
- Confirmation dialogs on destructive status transitions (Cancel booking/membership/request) — cheap, mechanical, closes a real UX gap.
- Subscription lifecycle automation (a single Hangfire recurring job checking `TrialEndsAt`) — the infrastructure to run it already exists and is unused.
- Wire the two Facility/Mall status-change gaps (`FacilityEventService`, `TenantNoticeService`) into the existing `*StatusRules` pattern.

**P2 — valuable later:**
- Customer/Owner/Tenant/Member/Vendor/Agent portals (depends on P0 email capability).
- Multi-currency.
- Credit/debit notes and a tax engine.
- Charting (wire the already-installed `recharts` dependency into existing dashboards).
- Generic approval-workflow engine (currently hardcoded per-flow, which is fine at current scale).
- Platform billing/invoicing of tenants (Stripe or equivalent) and self-service signup.
- Optimistic-concurrency tokens across the domain model.
- Unify or share a Finance-posting base to remove the four-times-duplicated posting logic (only urgent if a fifth posting need appears, or the `CountAsync()+1` entry-numbering race condition is observed in practice under real concurrent load).

**DEFER — not necessary yet:**
- HR/Payroll, Owner/Investor management, Marketing/Campaign depth, real GIS basemap, support-ticket/impersonation tooling, object storage backend (S3/Blob) beyond the local volume already provisioned.

---

## 13. Recommended Next Milestone

**Milestone 10 — Security & Finance Hardening** (not a new feature module): enforce tenant status at the API boundary, add AP clearing + fiscal-period closing + journal reversal to Finance, add the confirmation-dialog fix and the two status-rule gaps to the frontend/Facility modules, and stand up transactional email as the prerequisite for every subsequent portal/notification milestone. This sequencing exists because every module built on top of an unenforced tenant-status check or an incomplete accounting ledger inherits that gap silently — closing it now is cheaper than after Documents/Notifications/Portals/Reporting are all built on top of it, which is what `ROADMAP.md` currently schedules next (Milestones 9–13: Portals, Documents/Notifications, Reporting, SaaS, Production hardening — all of which have a hard or soft dependency on the items in this milestone).

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
| No optimistic-concurrency tokens anywhere | Entire domain model | Silent last-write-wins on concurrent edits | No — documented |
| `FacilityEventService`/`TenantNoticeService` skip status-transition validation | `Infrastructure/Services/Facility/Mall/*.cs` | Illegal status transitions possible (business-integrity, not security) | No — documented |
| Three parallel payment ledgers (Sales/Rental/Facility) | `Domain/Sales/Payment.cs`, `Domain/Property/RentPayment.cs`, `Domain/Facility/FacilityPayment.cs` | No unified "all money in" view without a three-way union query | No — each was locally correct; unify only when a fourth need appears |
| `SecurityDeposit` has no Finance/journal link | `Domain/Property/SecurityDeposit.cs`, `Infrastructure/Services/Property/SecurityDepositService.cs` | Deposits held are invisible on any balance sheet | No — documented, feeds P0 item |
| Hangfire/Redis provisioned, zero consumers | `DependencyInjection.cs`, `docker-compose.yml` | Infra cost with no functional benefit until a job/cache is actually implemented | No — intentional pre-provisioning |
| No shared `DataTable`/`Pagination`/`StatCard` frontend component | `frontend/src/modules/**/*Page.tsx`, dashboard pages | ~15-line pattern copy-pasted across 30+ files; will drift if left long enough | No — documented |
| `recharts` installed, unused | `frontend/package.json` | Dead dependency until Reporting milestone wires it in | No — documented |

---

## Verification performed this milestone

- **Backend tests:** 12/12 unit + 113/113 integration passed (112 pre-existing + 1 new regression test for the fixed cross-tenant role leak), 0 failures, 0 regressions, with both fixes applied.
- **Frontend build:** `npm run build` — 0 errors (`✓ 2357 modules transformed`).
- **Migration/schema:** one new migration this milestone, `FixRoleNameUniquePerTenant` (moves role-name uniqueness from global to per-tenant) — applied and schema-verified via `psql \d roles` against the dev database; no other schema changes.
- **`docker compose config`:** exits 0 with `.env.example` values.
- **Docker runtime verification:** not exercised — this sandbox's network policy blocks Docker Hub image pulls, consistent with every prior milestone's report.
- **Fix scope:** two production files changed (`AuthService.cs` — role resolution in `BuildAuthResultAsync` rewritten to be tenant-safe; `IdentityConfigurations.cs` — index definition) plus one migration (`FixRoleNameUniquePerTenant`) and one new regression test (`TenantIsolationTests.cs`) — no architecture change, no new module.
