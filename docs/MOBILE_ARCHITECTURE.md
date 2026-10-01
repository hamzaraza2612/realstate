# Mobile Application Architecture (Milestone 18)

This document is written **before** substantial mobile implementation, per the milestone's own
requirement. It inventories which existing backend APIs the mobile app consumes directly, and
specifies the mobile app's own architecture. No new business logic, domain entity, or duplicate rule
is introduced anywhere in this milestone — the mobile app is a new *client* of the existing backend,
exactly the same posture Milestone 16's AI layer and the External Portals took toward the ERP core.

## Technology choice

**React Native + Expo (SDK, managed workflow) + TypeScript**, per the spec's stated preference. One
codebase targets both Android and iOS — no two separate native apps, no WebView, no screenshot-based
UI. Expo Router (file-based, mirrors the web app's own route-per-file mental model) for navigation,
TanStack Query for all server state (the same library the web app already uses — one fewer concept to
relearn moving between the two codebases), and Expo SecureStore for token storage (see "Authentication"
below — this is the one non-negotiable security requirement the spec calls out by name).

No second web UI framework is introduced; React Native is not a web framework, and no Anthropic/AI
SDK of any kind is bundled into the mobile app (see "AI Command Center" below).

## Existing backend surface this app consumes (inspected before writing a line of mobile code)

Every one of the following already exists, is already tested, and needs zero backend change to serve
mobile:

| Capability | Existing endpoint(s) | Notes |
|---|---|---|
| Internal login/refresh/logout | `POST /api/v1/auth/{login,refresh,logout}` | Returns `{accessToken, accessTokenExpiresAt, refreshToken, user}`; `user.permissions` is the full flat permission-string array — identical shape the web app's `useAuthStore` already consumes. |
| Portal login/refresh/logout/profile | `POST /api/v1/portal/auth/{login,refresh,logout}`, `GET /api/v1/portal/auth/me` | Separate token family, separate claim set (`token_use: "portal"`, `portal_actor_type`, `portal_actor_id`) — see `docs/PORTAL_ARCHITECTURE.md`. Never shares a token store with the internal login. |
| Portal password reset | `POST /api/v1/portal/auth/{request-password-reset,reset-password}` | Reused as-is for a "forgot password" mobile flow. |
| RBAC / permission check | JWT `permission` claim array (internal) | The mobile app filters navigation the same way `Sidebar.tsx`/`navigation.ts` do on web — `hasPermission(code)` — but this is a UX convenience only; every write still re-checked server-side. |
| Command Center | `GET /api/v1/ai/command-center/summary`, `GET/POST /api/v1/ai/conversations[/…]`, `GET /api/v1/ai/action-proposals[/…]` | Milestone 16 API, consumed read/write exactly as the web Command Center module does. AI inference itself never leaves the backend — the mobile app only ever calls these REST endpoints. |
| Approvals | `GET /api/v1/approvals/inbox`, `GET /api/v1/approvals/{id}`, `POST /api/v1/approvals/{id}/decide` | The same endpoint AI action proposals are decided through (Milestone 16) — mobile reuses it unmodified; no second approval mechanism. |
| Notifications | `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`, `GET/PUT /api/v1/notification-preferences` | Portal notifications are the per-actor-type endpoints already on each `Portal*Controller` (e.g. `GET /api/v1/portal/customer/notifications`). |
| Documents | `GET /api/v1/documents`, `GET /api/v1/documents/{id}`, `POST /api/v1/documents` (multipart `IFormFile`), `POST /api/v1/documents/{id}/versions`, `GET /api/v1/documents/{id}/download` | Upload is already a standard multipart form post — the mobile app attaches a camera/gallery asset the same way a `<input type="file">` does on web, via `FormData`. No second document-storage system. |
| Reporting (management Home, Command Center inputs) | The existing Milestone 12 report endpoints (`/reports/executive`, `/reports/sales`, etc.) and Milestone 16's `IBusinessHealthService`/`IAttentionEngineService` via the Command Center summary | Mobile Home never computes its own KPIs — it renders the same authoritative numbers the web app and the AI layer already use. |
| Localization | `GET /api/v1/localization/current` (internal), `GET /api/v1/portal/localization` (portal — added in Milestone 17 for exactly this "a client has no staff RBAC permission but still needs the tenant's currency" problem) | Mobile bootstraps the identical `TenantLocalizationDto` the web app's `localizationStore` does, at the equivalent point in each auth flow. |
| CRM / Sales / Property / Construction / Procurement / Facility / Mall / Coworking data | The existing module APIs (`/crm/leads`, `/crm/customers`, `/sales/bookings`, `/property/*`, `/construction/*`, `/procurement/*`, `/facility/*`, etc.) | Every list endpoint already supports server-side pagination (`PagedRequest`/`PagedResult`) — mobile never loads an unbounded list into memory, satisfying the performance requirement without any backend change. |
| Portal module data | The existing `Portal{Customer,Tenant,Owner,Vendor,Member}Controller` endpoints, `AgentPortalController` | One-to-one with what each portal's web module already calls. |

**Every mobile screen is backed by an endpoint that already existed before this milestone** — a
direct consequence of Milestone 14-17's own discipline of building REST APIs that are consumed by a
generic `apiClient`/`portalApiClient` rather than hand-tuning responses for one specific frontend.
The one exception is the device-token registration endpoint described under "Push notifications"
below (`POST /api/v1/notifications/device-tokens` and `POST /api/v1/portal/device-tokens`) — a small,
additive pair of endpoints needed because no device-registration concept existed anywhere in the
backend before mobile needed one. Both reuse the existing `ITenantContext`/`IPortalContext` auth
patterns unchanged and are covered by `DeviceRegistrationTests.cs`.

## Mobile app structure

```
mobile/
  app/                      # Expo Router file-based routes (two top-level trees, see below)
    (auth)/                 # Login, portal-login, forgot-password — unauthenticated
    (internal)/             # Internal ERP user's whole app, behind AppUser auth
      (tabs)/                # Home, Work, Approvals, Notifications, Profile
      crm/ sales/ property/ construction/ procurement/ facility/ command-center/ ...
      agent/                 # The Agent view — INTERNAL (AgentPortalController is [Authorize], staff auth)
    (portal)/                # External portal user's whole app, behind PortalUser auth
      portal/customer/ tenant/ owner/ vendor/ member/   # one area per PortalProfile.actorType
  src/
    api/                    # apiClient.ts (internal), portalApiClient.ts (portal) — axios + interceptors
    auth/                   # AuthProvider, PortalAuthProvider, SecureStore-backed token stores
    components/             # Mobile design-system primitives (see "Design system" below)
    features/               # One folder per domain area, each with its own api hooks + screens
    navigation/             # Role-aware nav-item model (mirrors web's navigation.ts)
    hooks/                  # usePermission, useNetworkStatus, etc.
    i18n/                   # English/Arabic dictionaries + RTL plumbing (mirrors web's lib/i18n)
    storage/                # SecureStore wrapper, TanStack Query persistence
    theme/                  # Color tokens, typography scale, spacing — the mobile equivalent of M17's visual language
    utils/                  # money()/formatDate()/formatNumber() mirroring reports/format.ts
    types/                  # Mirrors frontend/src/types/api.ts (hand-kept in sync, not generated, matching the web app's own convention)
```

Business logic stays in the backend; the mobile app is presentation, local UI state, API
orchestration, secure session state, navigation, and the device capabilities (camera/gallery/
connectivity) the spec calls for — nothing else.

## Authentication

Two completely separate, non-interchangeable auth contexts, mirroring the backend's own separation
(`ITenantContext` vs `IPortalContext`, two JWT token families) rather than inventing a mobile-specific
third one:

- **Internal** (`AuthProvider`): `POST /auth/login` → access + refresh token, stored via
  `expo-secure-store` (iOS Keychain / Android Keystore) — never `AsyncStorage`, never plaintext. An
  axios response interceptor catches a `401`, attempts exactly one `POST /auth/refresh`, and on
  success retries the original request with the new access token; on refresh failure it clears the
  secure store and routes to the login screen. A `refreshPromise` singleton (mirroring the web
  `apiClient.ts`'s own pattern) ensures concurrent 401s from several in-flight requests trigger only
  one refresh call, never a thundering herd or an infinite loop.
- **Portal** (`PortalAuthProvider`): identical shape, separate `SecureStore` keys, separate axios
  instance (`portalApiClient`), targeting `/portal/auth/*`. A device can hold both an internal session
  and a portal session for different tenants/accounts without collision, matching the web app's own
  `useAuthStore`/`usePortalAuthStore` split — though in practice a user picks one login screen and one
  identity per install, same as any portal/erp separation in production.

On first launch (or after a full logout), the app shows a single chooser: "Sign in to your
organization" (internal) vs. "Sign in to your account" (portal) — never a mixed/ambiguous login form.

## Internal vs. portal: never mixed

The mobile app enforces the same hard boundary the web app and backend already enforce: an internal
session's navigator tree and a portal session's navigator tree are structurally distinct Expo Router
groups (`(internal)` vs. `(portal)`), sharing only the design-system component layer, never a data
hook, an API client instance, or a screen component. A portal user's app build never even imports an
internal-only screen module. Backend authorization remains authoritative in all cases — the mobile
UI's role/permission-based hiding of navigation items is the same **UX convenience, not a security
boundary** disclaimer that applies to the web app's `PermissionGate`.

How Phase 3 keeps that boundary concrete:

- The five portal areas (`app/(portal)/portal/{customer,tenant,owner,vendor,member}`) each get their own
  four-tab bar (Home, the area's primary records, Documents, Notifications; Account from the Home
  header) — deliberately not the internal Home/Work/Approvals module navigation. `/portal` redirects
  to the signed-in user's own area; each area's layout sends any other actor type back there.
- Portal data hooks are the shared `api/pagedQuery.ts` helpers bound once to `portalApiClient`
  (`features/portal/api/portalQueries.ts`); internal screens use the same helpers bound to
  `apiClient` (`api/paging.ts`). No portal screen module imports `apiClient` (the one transitive
  reference is `features/notifications/pushRegistration.ts`, which holds both the internal and the
  portal device-registration functions; the portal Account screen only calls the portal one).
- Portal documents are the per-actor read-only `GET {area}/documents` + `/documents/{id}/download`
  pair; the internal Documents feature (generic `/documents` + upload) is never used by the portal.
- The "Agent" actor is **not** a portal area: `AgentPortalController` is plain `[Authorize]`, self-scoped
  to the caller's staff `UserId`. Its mobile screens live in the internal app (`app/(internal)/agent`,
  Work tab → "My sales desk"), use `apiClient`, and are gated by `sales.booking.view` exactly like the
  web nav's "Agent Portal" entry.

## Role-aware internal navigation

Bottom tabs: **Home, Work, Approvals, Notifications, Profile** — not 20 modules in a tab bar. "Work" is
a single tab whose content is a role-filtered list of module shortcuts (CRM, Sales, Projects,
Property, Construction, Procurement, Facility, Reports, Command Center), computed from the same
`permission` strings the JWT already carries, via a shared `useVisibleModules()` hook that is the
direct mobile analogue of the web app's `useVisibleNavigation()` (`components/layout/navigation.ts`).
Tapping a module pushes a stack navigator scoped to that module (list → detail), not a nested tab bar.

## Management Home (not a shrunk Executive Dashboard)

Built specifically for a manager glancing at a phone between meetings, in this order: (1) Business
Health status strip (the same 6 M16 dimensions, collapsed to color-coded chips with a tap-to-expand
reason), (2) a short "What Needs Attention" card list (top 3, "View all" into the full list), (3) 2-3
KPI tiles the manager actually needs on the go (cash position, receivables, today's bookings — not all
8 desktop KPIs), (4) an Approvals-pending count with a direct jump, (5) Command Center entry point.
Everything reuses the same `GET /ai/command-center/summary` the web Command Center already calls —
there is no separate "mobile KPI" computation anywhere.

## AI Command Center on mobile

Mirrors the four web sections (Business Health / What Needs Attention / Recommended Actions / Ask
Your Business) adapted to a single scrollable screen with a bottom sheet for "Ask Your Business"
rather than a 4-panel desktop layout. The fact/analysis/recommendation/action-proposal visual
distinction from the web Command Center (structured data in cards, AI prose in a visually distinct
bubble, `FactsJson` never re-derived from the model's text) carries over unchanged, because it's
driven by the same API response shapes. **No Anthropic SDK or API key of any kind is ever bundled into
the mobile app** — every AI interaction is a REST call to the existing backend endpoints, which is
exactly where the real model call happens (or fails cleanly with `ai_provider_not_configured`, shown
as a clear "AI Business Intelligence is currently unavailable" state with the rest of the app fully
functional, per spec and per M16's own design).

## Offline / network handling

`@react-native-community/netinfo` for connectivity detection, surfaced as a persistent (dismissible)
banner, not a blocking screen. TanStack Query's own cache serves last-known data with a clear "last
updated" marker when offline — read-only, stale-but-labeled, never silently fresh-looking. Mutations
(approve/reject, create follow-up, record a maintenance request, etc.) are disabled with an explicit
"You're offline" state while connectivity is down — **no optimistic offline writes, no queued
mutation sync**, because the backend has no conflict-resolution protocol for that and silently
pretending a mutation succeeded while offline would violate the milestone's own "never pretend a
mutation succeeded while offline" rule. This is an explicit, documented scope boundary, not an
oversight — full offline write sync is listed as NOT IMPLEMENTED in the final report.

## Localization & RTL

Reuses the Milestone 15 architecture conceptually: an `i18n/` module with `en`/`ar` dictionaries (a
mobile-side port of the same key set the web app's `lib/i18n/` uses, not a code-shared package, since
the two apps have no existing shared-package build pipeline and introducing one is out of this
milestone's scope), `I18nManager.forceRTL()` for true RTL layout mirroring (React Native's own RTL
primitive — not a CSS-direction hack), and the same `money()`/`formatDate()`/`formatNumber()` pattern
ported from `frontend/src/modules/reports/format.ts`, reading the bootstrapped
`TenantLocalizationDto` exactly as the web app does. No duplicated Arabic screen files anywhere — one
screen implementation per route, mirrored by RTL layout flip, exactly matching the "do not create
duplicate Arabic screens" requirement.

## Design system

Mobile equivalents of the M17 web primitives, built as plain React Native components (no UI kit
dependency beyond what Expo ships) sharing the same *conceptual* visual language (status tone palette,
typography scale, spacing rhythm) documented in `docs/UX_AUDIT.md` — not pixel-identical, since mobile
has its own native interaction patterns (bottom sheets instead of dialogs, swipe actions instead of
hover row-actions, native `Alert`/custom sheet instead of a web `ConfirmDialog` component, pull-to-
refresh instead of a page-level refresh button).

## Push notifications

Four distinct layers, kept explicitly separate so "the seam exists" is never confused with "push
works":

1. **Notification data model** (existed before this milestone) — `Notification`/`NotificationPreference`.
2. **Device registration** (built in this milestone, real and tested) — `DeviceRegistration` domain
   entity (`backend/src/Domain/Notifications/DeviceRegistration.cs`), a small `IDeviceRegistrationService`
   upsert keyed by `(TenantId, OwnerId, IsPortalOwner, Platform)`, and two endpoints:
   `POST /api/v1/notifications/device-tokens` (staff, via `ITenantContext`) and
   `POST /api/v1/portal/device-tokens` (portal, via `IPortalContext`, any actor type — mirrors
   `PortalLocalizationController`'s "standalone `[RequirePortal]` controller" pattern). The mobile app's
   `registerInternalDeviceForPushAsync()`/`registerPortalDeviceForPushAsync()`
   (`mobile/src/features/notifications/pushRegistration.ts`) request OS notification permission, obtain
   an Expo push token, and POST it to the matching endpoint — wired to a real "Register this device"
   action on the internal Profile screen. This is genuinely persisted and upserted (verified by
   `backend/tests/IntegrationTests/DeviceRegistrationTests.cs`: registration, re-registration upsert,
   invalid-input rejection, cross-auth rejection, tenant isolation).
3. **Push provider integration** (not attempted) — no APNs/FCM credentials or SDK wiring exist anywhere
   in this codebase.
4. **Actual delivery** (not attempted, not claimed) — nothing reads `DeviceRegistration` rows and sends
   a push. A registered token sits in the database, used by nothing, until a future milestone adds a
   real provider integration (exactly the same honest-disclosure situation Milestone 16 was in with
   `ANTHROPIC_API_KEY`).

The mobile UI reflects this precisely: the Profile screen's action is labelled "Register this device" /
"This device is registered," never "Notifications enabled," because registering is true today and
enabling delivery is not.

## What this milestone does NOT build

Per spec: no native mobile app *and* a parallel feature expansion — this is purely the mobile client.
No live payment gateway, no ZATCA/Ejar integration, no autonomous AI, no document AI/OCR, no full
offline write synchronization, no advanced CRM automation, no marketing-site/brand work, no commercial
launch activity. Those remain M19-M22 as already fixed in `docs/ROADMAP.md`.
