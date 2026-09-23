# External Portal Architecture (Milestone 13)

This document covers the External Portal foundation introduced in Milestone 13: a second,
parallel authentication surface for people who are not internal ERP staff — customers, rental
tenants, property owners, vendors, and coworking members — plus the Agent/Broker Portal, which
deliberately does **not** use this foundation. It exists so the identity model, JWT claim scheme,
and authorization isolation mechanism are documented once rather than re-derived from source on
every future change.

## Why a separate `PortalUser` table instead of reusing `AppUser`

ASP.NET Core Identity enforces a **platform-wide** unique index on `NormalizedUserName`, and every
`AppUser` in this codebase has `UserName == Email`. That means the same real person could never
hold two portal accounts under two different tenants with the same email address if portal
identities were just more `AppUser` rows — a real scenario (an owner who is also a tenant
elsewhere, an agency's contact used across two of its client organizations).

`PortalUser` is a plain `TenantEntity` (not an Identity `IdentityUser`) with a **tenant-scoped**
unique index on `(TenantId, NormalizedEmail)` — the same email can register a portal account at
any number of different tenants. A second unique index on `(TenantId, ActorType, ActorId)`
guarantees one portal login per external actor per tenant.

Keeping "internal staff with roles" (`AppUser`) and "external actor with no internal role"
(`PortalUser`) as two distinct tables also makes the security boundary a property of *which table
issued the token*, not a fragile "assigned zero roles" convention that a future internal change
could accidentally violate.

## The five actor types

`Domain/Portal/PortalActorTypes.cs` defines exactly five external actor kinds:

| ActorType | The row `ActorId` points at | Portal area |
|---|---|---|
| `Customer` | `Customers` | Customer Portal |
| `RentalTenant` | `RentalTenants` | Tenant Portal |
| `PropertyOwner` | `PropertyOwners` (new in this milestone) | Owner Portal |
| `Vendor` | `Vendors` | Vendor Portal |
| `CoworkingMember` | `CoworkingMembers` | Coworking Member Portal |

Each string is deliberately identical to the corresponding `Domain.Documents.DocumentEntityTypes`
constant, so a portal actor's own documents and notifications can be looked up with the actor's
own `(ActorType, ActorId)` pair directly — no separate mapping table, no per-type switch statement
in most call sites.

Agent/Broker is **not** on this list — see "Why the Agent Portal is different" below.

## JWT claim scheme — deliberate reuse, not a parallel stack

A portal access token carries the **same claim names** as an internal access token:

- `sub` — `PortalUser.Id` instead of `AppUser.Id`
- `tenant_id` — identical semantics to an internal token

Because `ITenantContext` (`Infrastructure/Services/TenantContext.cs`) reads exactly these two
claim names with no branching on token type, it — and therefore the EF Core global tenant query
filter, and the entire pre-existing `INotificationService` (which scopes every read/write by
`_tenantContext.UserId ?? Guid.Empty`) — work **completely unmodified** for portal sessions. A
`Notification` row addressed to a `PortalUser.Id` is invisible to every other user for exactly the
same reason an internal notification is: there is no foreign key on `Notification.UserId` at all
(verified directly against `NotificationConfigurations.cs`), so storing either kind of id there is
equally safe, and the existing per-`UserId` scoping already does the isolation work.

Three claims exist only on portal tokens, added purely to support portal-specific checks:

- `token_use = "portal"` — the single fact every isolation check below hinges on.
- `portal_actor_type`, `portal_actor_id` — read by `IPortalContext` (`PortalContext.cs`), gated on
  `token_use == "portal"` so it never misreads an internal token's absent claims as a match.

No roles or permissions claims are ever added to a portal token — a portal identity has no
internal RBAC standing at all, by construction.

## Authorization isolation — two independent, redundant layers

ASP.NET Core resolves a bare `[Authorize]` action against `AuthorizationOptions.DefaultPolicy`,
but this codebase's `[RequirePermission]` attribute builds a **brand-new** policy via
`PermissionPolicyProvider.GetPolicyAsync` for any dotted permission-code policy name — that fresh
policy does **not** inherit the default policy's requirements. Guaranteeing "a portal token can
never reach an internal endpoint" therefore needed two independent checks, not one:

1. **`NotPortalRequirement`** is added to `AuthorizationOptions.DefaultPolicy` itself
   (`Program.cs`), so every bare `[Authorize]` controller (`NotificationsController`,
   `ApprovalsController`'s inbox, etc.) rejects a portal token with no per-controller change.
2. **`PermissionAuthorizationHandler`** (used by every `[RequirePermission]`-gated endpoint) was
   given an explicit, first-line check: `if (token_use == "portal") { fail immediately }` — because
   its policy is freshly built and would otherwise never see the default policy's requirement.

Both layers reject with `403 Forbidden` (the caller is authenticated, just disallowed) — never
`401`, which is reserved for "not authenticated at all."

The reverse guarantee — an internal token can never reach a portal endpoint — is a single,
simpler check: `PortalOnlyRequirement` backs a named `"PortalOnly"` policy, and `RequirePortal`
(`: AuthorizeAttribute` with that policy name) gates every controller under `Api/Controllers/Portal/`.
An internal token never carries `token_use`, so it fails this policy the same way an anonymous
request does — except anonymous gets `401` (no authenticated user at all) and an internal token
gets `403` (authenticated, wrong kind).

### Actor-type isolation within the portal itself

A Vendor's portal token is valid against the shared `"PortalOnly"` policy, so it must still be
stopped from reaching `/api/v1/portal/tenant/*`. `PortalControllerBase` (`Api/Controllers/Portal/
PortalControllerBase.cs`) adds one more explicit check per controller — `RequiredActorType` — and
every action calls `WrongActorType(out result)` before doing anything else, returning `403` on a
mismatch. This is intentionally NOT folded into the `RequirePortal` policy itself, because the
required actor type differs per controller while the policy is shared by all of them.

### Object-level ownership — the last mile

None of the above proves a Customer can only see *their own* booking — only that a Customer-typed
token can reach Customer-typed endpoints. Object ownership is enforced inside each portal service,
one call at a time, following the codebase's existing "a cross-tenant/cross-owner row is `404`, not
`403`" convention (so a portal user can never distinguish "doesn't exist" from "exists but isn't
yours"):

- `PortalCustomerService.GetBookingAsync` — `booking.CustomerId != CustomerId` → `not_found`.
- `PortalTenantService.GetLeaseAsync` — `lease.RentalTenantId != RentalTenantId` → `not_found`.
- `PortalOwnerService` — every property query is filtered by `PropertyOwnerId` at the SQL level,
  not filtered client-side after a broader fetch.
- `PortalVendorService.GetPurchaseOrderAsync` — `po.VendorId != VendorId` → `not_found`.
- `PortalMemberService.GetBookingAsync` — `booking.MemberId != MemberId` → `not_found`.
- Every document download additionally re-verifies the document's `(EntityType, EntityId)` belongs
  to the caller (directly, or transitively through a booking/lease/property the caller owns)
  *before* calling into `IDocumentService.DownloadAsync` — see each service's
  `VerifyDocumentOwnershipAsync`/inline equivalent.

Two `*Filter` records gained new optional, backward-compatible trailing parameters so the Tenant
and Vendor Portals could reuse the existing `IMaintenanceService.ListAsync` outright instead of a
new query: `MaintenanceRequestFilter.RentalTenantId` and `.AssignedVendorId`.

**Note on `POST maintenance-requests` (Tenant Portal):** this create endpoint maps every service
failure — including the "that lease isn't yours" ownership check — to `400 Bad Request` with an
`code` field (`not_found`), not `404`, matching this codebase's existing convention that create
endpoints return `400` for all `Result` failures regardless of cause. The access is still denied;
only the HTTP status differs from the `GET`-style endpoints.

## Why the Agent/Broker Portal is different

`Booking.SalesAgentUserId` already references an internal `AppUser` (see that field's own doc
comment), and `DbSeeder` already seeds "Sales Agent" as an internal-staff role. There is no
external, non-staff "broker" concept anywhere in this domain. Building a sixth external identity
type for agents would have been exactly the kind of unnecessary new auth surface Milestone 13's
own instructions warned against ("Do NOT create six independent authentication systems").

`AgentPortalController` (`Api/Controllers/AgentPortalController.cs`) is therefore a plain
`[Authorize]` controller — no `[RequirePortal]`, no `PortalUser` row, no new login endpoint. Every
action is self-scoped to the caller's own `ITenantContext.UserId`, the same self-scoping pattern
already used by `NotificationsController`. It is a restricted, agent-scoped **view** over data the
agent already has access to under their existing internal session, not a new login surface.

No commission DTO or service exists anywhere in `IAgentPortalService`: the domain model has no
commission-rate or commission-ledger field anywhere to compute one from, so — per the milestone's
own conditional instruction ("commission foundation if current domain supports it... do not
invent... create only a clean extension point where necessary") — the conclusion reached was that
no extension point was even needed, since there is no data to build one from yet.

## Portal account lifecycle

`PortalAccountsController` (`api/v1/portal-accounts`, internal-staff-only, gated by the single
tenant-wide `Portal.ManageAccounts` permission — the same "one permission spans a cross-cutting
foundation" precedent as `Documents.View`/`Approvals.View`/`Reports.View`) is how an internal user
invites, deactivates, and reactivates portal accounts for any of the five actor types through one
consistent surface, rather than each actor type having its own invite flow.

Inviting an actor creates the `PortalUser` row with an unusable random password hash and
immediately issues a password-reset token — functioning as an activation link — via
`PortalPasswordResetIssuer.IssueAndEmailAsync`. The same class backs the ordinary "forgot password"
flow (`IPortalAuthService.RequestPasswordResetAsync`); activation and reset are the same mechanism
with a different starting state, not two implementations. Because a `PortalUser` has no `AppUser`
row for `ICommunicationService`'s existing AppUser-email lookup to resolve, both paths call
`IEmailSender.SendAsync` directly instead.

Manual lockout (5 failed attempts → 15 minute lockout, via plain `AccessFailedCount`/
`LockedOutUntil` fields on `PortalUser`) is a deliberately simpler, self-contained equivalent to
the internal account's Identity-managed lockout — `PortalUser` doesn't use `UserManager`/
`SignInManager`, so there is no lockout machinery to reuse.

Password hashing reuses ASP.NET Core Identity's own `PasswordHasher<T>` class directly
(`IPasswordHasher<PortalUser>` → `PasswordHasher<PortalUser>`), the same PBKDF2 algorithm as
internal accounts, without pulling in a full Identity/UserStore stack for a table Identity doesn't
own.

## Extension points deliberately left unimplemented

- **Payments**: `IPortalPaymentIntentProvider` (`Application/Portal/PortalPaymentModule.cs`) is
  registered with exactly one implementation, `UnconfiguredPortalPaymentIntentProvider`, which
  always returns a clean `payment_provider_not_configured` failure — mirroring
  `LoggingEmailSender`'s "safe by default, real behavior added later behind an unchanged interface"
  shape from Milestone 11. No endpoint calls it yet; no "Pay Now" button exists. This is the
  intended seam for a future Stripe/regional/UAE payment gateway — the interface takes an amount,
  currency, and a description, with no provider-specific fields baked in.
- **MFA / email verification / magic-link / OTP**: `PortalUser.EmailConfirmed` exists as a field
  but nothing sets it to `true` outside of test setup, and no OTP/magic-link provider is wired.
  These were explicitly out of scope for this milestone.
- **Mobile app / native client**: the JWT-based auth here works unmodified for a future mobile
  client (nothing in the token scheme is web-session-specific); the client itself is out of scope.

## Notification wiring — one deliberate integration point

`DocumentService.UploadAsync` calls a new private `NotifyLinkedPortalUserAsync` after its existing
audit-log call: it looks up an active `PortalUser` whose `(ActorType, ActorId)` matches the
uploaded document's `(EntityType, EntityId)` and, if one exists, creates a
`NotificationCategory.DocumentUploaded` notification for that `PortalUser.Id` using the existing
`INotificationService`/`NotificationTemplates`. This works uniformly across all five actor types
for the same reason document-ownership checks do — the string constants match exactly.

This is the **one** trigger deliberately wired for this milestone. Other natural extension points
(a payment recorded against a lease/booking, a maintenance request's status changing) are
explicitly **not** wired, matching the disciplined, narrow-scope pattern already used in Milestones
11 and 12 — a real, working example proves the mechanism without claiming a completeness the
codebase doesn't have yet.

## What was NOT built in this milestone

Per the milestone's own explicit exclusions: no SaaS billing/subscriptions, no UAE government
integrations, no native mobile app, no AI assistant, no marketing site, and no full visual
redesign of the portal UI (it reuses the existing design system's primitives with portal-specific
navigation/layout, not a second design language).
