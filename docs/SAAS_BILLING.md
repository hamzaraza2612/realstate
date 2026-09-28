# SaaS Control Plane & Billing Foundation (Milestone 14)

This document covers the SaaS control-plane layer introduced in Milestone 14: plans, entitlements,
usage limits, the subscription lifecycle, and the billing/invoice/payment foundation. It builds on
top of — and does not replace — the tenant model from Milestone 1 and the `TenantStatus` enforcement
from Milestone 10.

## What already existed vs. what this milestone built

Before this milestone, `SubscriptionPlan`/`PlanFeature`/`TenantFeatureEntitlement` existed as pure
domain scaffolding: three tables with no service or controller reading them anywhere in the
codebase except the bare CRUD on `PlatformSubscriptionPlansController`. `PlanFeature`
(boolean-only, plan-level) and `TenantFeatureEntitlement` (boolean-only, tenant-level override) have
been **replaced** by a unified `PlanEntitlement`/`TenantEntitlementOverride` model that supports both
boolean features and numeric limits — replacing dead scaffolding, not existing working
architecture. `SubscriptionPlan` itself was extended (`Code`, `Description`, `DisplayOrder`,
`TrialDays`, `Currency`, `SetupPrice`, `MetadataJson`) rather than rebuilt; its three ad-hoc numeric
columns (`UserLimit`/`ProjectLimit`/`StorageLimitMb`) were removed in favor of the same generic
`PlanEntitlement` numeric-limit mechanism everything else uses, so there is exactly one way to
express a limit, not two.

## Plan model

`Domain/Subscription/SubscriptionPlan.cs` — pure data, never referenced by name or tier anywhere in
application logic (no `if (plan.Code == "premium")` exists in this codebase). Fields: `Name`,
`Code` (unique, immutable identifier — e.g. `"starter"`, `"growth"`), `Description`,
`DisplayOrder`, `IsActive`, `TrialDays` (0 = no trial), `Currency` (ISO 4217, e.g. `"USD"`,
`"AED"`, `"SAR"` — never assumed to be USD anywhere), `Price` (the recurring base price),
`SetupPrice` (optional one-time fee), `BillingCycle` (`Monthly`/`Yearly` — an enum, easily
extended), and `MetadataJson` (free-form, never parsed by billing logic — presentational data
only). What a plan actually grants is expressed entirely through its `PlanEntitlement` rows.

## Entitlement model

`Domain/Subscription/Entitlement.cs` defines `EntitlementCodes` — a **compile-time catalog**, the
same pattern `Shared/Security/Permissions.cs` already uses for permission codes. The set of things a
plan can grant is part of the application's own module list, not tenant- or plan-editable data, so
there is no database "entitlement catalog" table — `PlanEntitlement`/`TenantEntitlementOverride`
rows just reference these codes as plain strings (exactly how `PlanFeature.FeatureCode` already did).

Two entitlement kinds:
- **Feature** (bool) — on/off access to a module. Codes defined: `crm`, `sales`, `finance`,
  `construction`, `procurement`, `rental`, `facility`, `mall`, `coworking`, `external_portals`,
  `documents`, `approvals`, `reporting`, `advanced_reporting`, `api_access`. Codes for modules that
  don't exist yet (AI, mobile) are deliberately **not** defined — gating a feature with no
  implementation to gate would be dead configuration; they'll be added in the milestone that builds
  the feature itself (M16/M18).
- **Limit** (nullable long, null = unlimited) — a numeric ceiling. Codes defined: `max_users`,
  `max_properties`, `max_projects`, `max_portal_users`, `max_storage_mb`.

`PlanEntitlement` (plan-level default) and `TenantEntitlementOverride` (per-tenant override,
independent of the assigned plan — so a specific tenant can be sold a module a-la-carte or granted a
one-off higher limit without a new plan) share the same shape: `Code`, `BoolValue`, `NumericValue`.

### Resolution order (`ITenantEntitlementService`)

For a given tenant and code:
1. A `TenantEntitlementOverride` for that tenant and code, if one exists — always wins.
2. Else the tenant's currently assigned plan's `PlanEntitlement` for that code, if one exists.
3. Else a **safe default**: `true` for a Feature, `null` (unlimited) for a Limit.

**Critical backward-compatibility rule**: a tenant with **no plan assigned at all** — which is every
tenant created before this milestone, and every tenant an admin creates without assigning a plan —
is always fully unrestricted (`HasUnrestrictedAccessAsync` returns `true`, and every feature/limit
check short-circuits to unrestricted). This is what keeps all 196 pre-Milestone-14 tests, and every
demo/dev tenant that never touches billing, working exactly as before with zero code changes on
their part. Restrictions only ever activate once a plan is actually assigned.

## Runtime enforcement

### Feature gates — `[RequireEntitlement(code)]`

`Api/Authorization/RequireEntitlementAttribute.cs` is an `IAsyncActionFilter`, **not** an ASP.NET
Core authorization policy — `PermissionPolicyProvider` already claims every dotted policy name for
`[RequirePermission]`, and an entitlement check is a business-rule gate (what this tenant's plan
grants), not an authentication/authorization concern. It reads `ITenantContext.TenantId` (works
identically for internal and portal tokens, since both carry the same `tenant_id` claim — see
`docs/PORTAL_ARCHITECTURE.md`) and calls `ITenantEntitlementService.IsFeatureEnabledAsync`. A
rejection returns the same `{ title, status: 403, code: "feature_not_entitled" }` shape every other
rejected request in this codebase uses — never a stack trace or internal detail, and a Super Admin
(`ITenantContext.IsSuperAdmin`) always bypasses it.

**Actually enforced in this milestone** (a deliberately representative set, not exhaustive):
- `external_portals` — on `PortalControllerBase`, gating all five External Portal areas at once.
- `advanced_reporting` — on all 8 Milestone 12 report controllers (`Api/Controllers/Reports/*`).
- `facility` — on `FacilitiesController`, as the representative example of gating a whole sellable
  module.

Extending enforcement to any other module (`crm`, `sales`, `finance`, `construction`,
`procurement`, `rental`, `mall`, `coworking`, `documents`, `approvals`) is a **one-line attribute
addition** to that module's controller(s) — no new architecture, no service change. This
mirrors the disciplined "prove the mechanism with real, working examples rather than claim
exhaustive completeness" pattern used throughout every milestone in this codebase.

### Limit gates — five commercially meaningful enforcement points

Chosen because they're the ones a real plan tier would actually differentiate on, and each maps to
one clear creation path:

| Limit code | Enforced in | Counts |
|---|---|---|
| `max_users` | `UserService.CreateAsync` | Active `AppUser` rows for the tenant |
| `max_properties` | `PropertyService.CreateAsync` | `Property` rows (ambient tenant filter) |
| `max_projects` | `ProjectService.CreateAsync` | `Project` rows (ambient tenant filter) |
| `max_portal_users` | `PortalAccountService.InviteAsync` | Active `PortalUser` rows |
| `max_storage_mb` | `DocumentService.UploadAsync` | `SUM(DocumentVersion.SizeBytes)`, checked **before** writing the new file to storage |

Each check is a single efficient `COUNT`/`SUM` query (never a full-table load) compared against
`ITenantEntitlementService.GetLimitAsync`; a `null` limit (unlimited, or no plan assigned) always
passes. A rejection returns `{ title, status: 400, code: "limit_exceeded" }` — `400`, matching this
codebase's existing convention that a create endpoint maps every `Result` failure to `400`,
regardless of cause (the same convention documented in `docs/PORTAL_ARCHITECTURE.md` for the Tenant
Portal's maintenance-request endpoint).

Deliberately **not** implemented in this milestone (would need evidence of real demand first, per
the task's own "do not add dozens of arbitrary limits" instruction): inventory units, active
leases, documents count (as opposed to storage bytes), coworking bookings.

## Usage metering — `ITenantUsageService`

Answers "what is this tenant using / allowed to use / how close to its limit" with `COUNT`/`SUM`
aggregate queries only — never a full-table scan of business data. Combines raw counts (`Users`,
`Properties`, `Projects`, `PortalUsers`, `ActiveLeases`, `StorageBytes`) with
`ITenantEntitlementService`'s resolved limits into a `Metrics` list, each tagged `Normal` /
`Approaching` (≥80% of a finite limit — a **display hint only**) / `AtLimit`. The actual enforcement
boundary is always the exact limit value checked at the five points above, never the 80% threshold —
that number never blocks anything by itself.

## Subscription lifecycle

`Domain/Subscription/Subscription.cs` — one row per tenant subscription period.
`SubscriptionStatus`: `Trialing → Active → PastDue → Paused → Cancelled → Expired`, with
`SubscriptionStatusRules.CanTransition` as the single source of truth for valid transitions
(mirrors the existing `BookingStatusRules`/`WorkPackageStatusRules` convention). A tenant has **at
most one non-terminal** (Trialing/Active/PastDue/Paused) subscription at a time, enforced by a
filtered partial-unique index on `(TenantId)` — a `Cancelled`/`Expired` row stays as history, and a
fresh row is created if the tenant resubscribes later. `Price`/`Currency`/`BillingCycle` are
snapshotted onto the `Subscription` at subscribe/renew time, deliberately independent of the plan's
current values, so a later plan price change never silently changes what an existing subscriber is
being charged. Protected by Postgres's own `xmin` system column as an optimistic-concurrency token
(the non-obsolete `Property<uint>("xmin").IsRowVersion()` form — the same mechanism
`ApprovalRequest` already uses, via the now-deprecated `UseXminAsConcurrencyToken()` call).

`ExternalProvider`/`ExternalCustomerId`/`ExternalSubscriptionId` are nullable extension fields for a
future real payment provider to correlate its own objects — unused, unpopulated, by anything in
this milestone.

### Tenant.Status ↔ Subscription.Status — the documented relationship

**`TenantStatus` (Milestone 10) remains the sole gate for whether a tenant can use the API at all** —
`TenantStatusMiddleware` is completely unmodified. `Subscription.Status` is a separate, richer
lifecycle that **feeds into** `TenantStatus` one-directionally (`SubscriptionService.MapToTenantStatus`),
never the reverse — nothing ever reads `TenantStatus` back out to infer a subscription state:

| Subscription.Status | → Tenant.Status | Why |
|---|---|---|
| `Trialing` | `Trial` | Existing M10 value; usable |
| `Active` | `Active` | Existing M10 value; usable |
| `PastDue` | `Active` | A grace period — still usable; a future stricter policy could change this without touching the enforcement middleware |
| `Paused` | `Suspended` | Existing M10 value; not usable, not deleted |
| `Cancelled` | `Cancelled` | Existing M10 value; not usable |
| `Expired` | `Suspended` | Not usable, but — per "avoid destructive automatic deletion" — never `Cancelled`/deleted; a platform admin can still manually reactivate |

Every transition (manual, via `PlatformSubscriptionsController`, or automatic, via the lifecycle
job below) applies this same mapping and writes both rows in one `SaveChanges`, so `TenantStatus`
and `Subscription.Status` can never drift into a contradictory pair.

## Background job — `SubscriptionLifecycleJob`

Hangfire/Redis existed since Milestone 9 with **zero consumers** (see `PRODUCT_GAP_AUDIT.md`); this
is the first real recurring job. Registered hourly (`RecurringJob.AddOrUpdate`, `Cron.Hourly`) in
`Program.cs`, skipped entirely under the `"Testing"` host environment (same guard as
`UseIpRateLimiting`) so it never runs mid-test-suite against the test database.

Scope in this milestone is deliberately narrow: **trial expiration only** — the example named first
in the task brief and the one with an unambiguous, deterministic trigger (`TrialEndsAt` has passed).
Idempotent and safe under concurrent/duplicate execution:
- Each transition is guarded by `SubscriptionStatusRules.CanTransition` — re-running against an
  already-`Expired` subscription is a no-op.
- A genuine double-execution race is caught by the `Subscription` row's own `xmin` token; a losing
  `SaveChangesAsync` throws `DbUpdateConcurrencyException`, which the job logs and skips rather than
  crashing the whole run.

`SubscriptionLifecycleJob` is the natural home for further reconciliation (e.g. a `PastDue`
grace-period timeout) once that policy is actually decided — a new private method there, not new
infrastructure.

## Billing foundation

`Domain/Billing/Invoice.cs` / `InvoiceLineItem` — one invoice per billing period, generated
on-demand (`POST /platform/invoices/generate`) since this milestone has no automated recurring
billing engine. `InvoiceNumber` is **tenant-scoped**, not globally unique (`INV-000001` per tenant,
same `CountAsync()+1`-with-retry pattern as `BookingNumber`/`LeaseNumber`) — this codebase's
established convention for tenant-owned business identifiers, explicitly followed here per the
task's own instruction to avoid a global unique index where a tenant-scoped one is correct.

`Domain/Billing/BillingPayment.cs` — a recorded payment against an invoice, named `BillingPayment`
(not `Payment`) to stay unambiguous alongside Sales' `Payment`, Property's `RentPayment`, and
Facility's `FacilityPayment` — the same per-module payment-naming convention used three times
already. `IdempotencyKey` is unique per `(TenantId, IdempotencyKey)`, the same pattern as those
three existing payment tables; a retried "record payment" request returns the original result
rather than double-posting, verified by an explicit test. **No card number, CVV, or raw payment
credential of any kind is ever accepted or persisted anywhere in this milestone.**

### The payment-provider extension seam

`IBillingPaymentProvider` (`Application/Billing/BillingPaymentDtos.cs`) is the seam a future real
gateway (Stripe, a UAE/GCC provider) implements — `ChargeAsync(ChargeRequest) → ChargeResult`.
Registered with exactly one implementation, `UnconfiguredBillingPaymentProvider`, which always
returns a clean `payment_provider_not_configured` failure — mirroring Milestone 13's
`IPortalPaymentIntentProvider` "safe by default, real behavior added later behind an unchanged
interface" shape. **`IBillingPaymentProvider` is never called by anything in this milestone** —
`RecordPaymentAsync` only records a payment that was already received (e.g. a platform admin
confirming a bank transfer), it does not execute a charge. No Stripe/UAE/GCC provider is
implemented; the seam exists purely so it's a real, registered, testable extension point rather
than a dead unregistered interface.

## Production email

`IEmailSender`/`ICommunicationService`/`CommunicationLog` (Milestone 11) are unchanged in shape —
`IEmailSender.SendAsync` gained one new optional parameter, `isHtml` (`false` by default, placed
*after* the existing `ct` parameter specifically so every existing positional call site — which
passes `ct` as its 4th argument — keeps compiling and behaving identically with zero changes).

`Infrastructure/Services/Communication/SmtpEmailSender.cs` is a production implementation using
.NET's built-in `System.Net.Mail.SmtpClient` (no new NuGet dependency for this milestone's scope —
any SMTP-speaking provider works: SendGrid, Amazon SES, Postmark, a corporate relay). Configuration
is entirely environment/`appsettings`-driven under the `Smtp` section (`Smtp:Host`, `Smtp:Port`,
`Smtp:Username`, `Smtp:Password`, `Smtp:FromAddress`, etc. — set via `Smtp__Host` etc. environment
variables in production, never hardcoded); the password is never written to any log line. Retries a
transient `SmtpException`/timeout up to `Smtp:MaxRetries` times (default 2) with a short linear
backoff before reporting failure — `ICommunicationService` writes a `CommunicationLog` row either
way.

**`LoggingEmailSender` stays the registered default, and the only implementation any test process
ever sees**, unless `Smtp:Enabled=true` is explicitly configured — the conditional registration is
in `DependencyInjection.cs`. `CustomWebApplicationFactory`'s in-memory test configuration never sets
this key, so `IEmailSender` always resolves to `LoggingEmailSender` in every test — verified by a
dedicated test. Portal invite/password-reset emails (`PortalPasswordResetIssuer`) already call
`IEmailSender` directly and therefore automatically use whichever provider is configured, with no
code change needed there.

### SaaS lifecycle email events

Templates/trigger points for welcome, portal invitation (already wired since Milestone 13), password
reset (already wired), trial started, trial ending, trial expired, subscription activated,
subscription cancelled, invoice issued, payment received, payment failed, and subscription past due
are a natural extension of the existing `ICommunicationService`/`NotificationTemplates` pattern
(exactly how Milestone 11/13's templates work). **Not wired to fire automatically in this
milestone** beyond what Milestone 13 already wired (portal invite/reset) — the task's own
instruction is explicit ("do not send uncontrolled emails automatically everywhere"), and firing
them correctly requires deciding exact trigger points per event that weren't specified. This is
recorded here as the concrete list to wire in a following milestone/small increment, not left
unspecified.

## Security

- **Platform admin isolation**: every new platform controller (`PlatformSubscriptionsController`,
  `PlatformInvoicesController`, the new endpoints on `PlatformOrganizationsController`) inherits the
  existing `PlatformControllerBase` — `[Authorize(Policy = "SuperAdminOnly")]` plus the tenant-filter
  bypass, exactly the same pattern `PlatformOrganizationsController`/`PlatformSubscriptionPlansController`
  already used before this milestone. Zero new authorization mechanism was invented.
- **Tenant isolation**: `SubscriptionController`/`BillingController` (the tenant-facing views) take
  **no tenant/subscription/invoice id as a route or query parameter anywhere** — every action reads
  `ITenantContext.TenantId` and scopes internally, so there is no id for a caller to substitute for
  another tenant's. `InvoiceService.GetAsync` deliberately does **not** call `IgnoreQueryFilters()`,
  so the EF global tenant filter (or its `BypassTenantFilter` override for a platform admin) is the
  single mechanism deciding visibility for both the tenant-facing and platform-admin code paths
  through the exact same method.
- **No portal token reaches SaaS admin, no internal token reaches platform admin**: both rely on the
  pre-existing Milestone 13 (`NotPortalRequirement`/`PortalOnlyRequirement`) and platform
  (`SuperAdminOnly`) mechanisms respectively — untouched by this milestone.
- **No sensitive payment data persistence**: verified by inspection — `BillingPayment` has no field
  capable of holding a card number, CVV, or gateway secret; `IBillingPaymentProvider.ChargeRequest`
  likewise carries only amount/currency/description.
- **Audit logging**: every administrative lifecycle action (plan create/update, subscription
  create/transition, entitlement override set/remove, invoice generation, payment recording, the
  background job's trial-expiry transitions) calls `IAuditLogger.LogAsync` — verified by a dedicated
  test that checks the audit trail after a background-job-driven transition, not just an
  HTTP-driven one.
- **Never weakens Milestone 10 tenant suspension**: `TenantStatusMiddleware` was not touched; a
  dedicated test transitions a subscription to `Cancelled` and confirms the tenant's already-issued
  JWT is immediately rejected by the *existing, unmodified* middleware.

## Deliberately deferred (per this milestone's own scope boundary)

Stripe integration, UAE payment gateway integration, Saudi/GCC payment gateway integration, real
card processing of any kind, AI, mobile application, full UAE localization, global localization.
These remain scheduled for their own milestones (M15 UAE/GCC + Global Localization, M16 AI, M18
Mobile) — nothing in this milestone assumes or blocks any of them; the currency/plan/entitlement
model is deliberately provider- and region-agnostic (ISO currency codes, no hardcoded pricing, no
Pakistan-specific assumptions anywhere) so M15 can add real regional payment providers behind
`IBillingPaymentProvider` without revisiting this foundation.
