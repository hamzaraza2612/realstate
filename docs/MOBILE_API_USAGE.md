# Mobile API Usage (Milestone 18)

This is the concrete, per-screen companion to `docs/MOBILE_ARCHITECTURE.md`: which mobile screen
calls which backend endpoint, with which client, and what it shows. Every endpoint listed here
already existed before this milestone except the two explicitly marked **(new, M18)** — both are
small, additive, and covered by `backend/tests/IntegrationTests/DeviceRegistrationTests.cs`.

Two axios instances, never mixed: `apiClient` (internal, `AppUser`/RBAC, `ITenantContext`) and
`portalApiClient` (external portal, `PortalUser`/actor-type, `IPortalContext`). A column below says
which one each row uses.

## Auth

| Screen | Client | Endpoint(s) |
|---|---|---|
| Internal login (`(auth)/login.tsx`) | `apiClient` | `POST /auth/login` |
| Internal session restore / refresh | `apiClient` | `POST /auth/refresh` (single-flight, on any 401) |
| Internal sign-out | `apiClient` | `POST /auth/logout` |
| Portal login (`(auth)/portal-login.tsx`) | `portalApiClient` | `POST /portal/auth/login` |
| Portal forgot/reset password | `portalApiClient` | `POST /portal/auth/request-password-reset`, `POST /portal/auth/reset-password` |
| Portal session restore / refresh | `portalApiClient` | `POST /portal/auth/refresh` |
| Portal sign-out | `portalApiClient` | `POST /portal/auth/logout` |
| Portal profile refresh (background, on session restore) | `portalApiClient` | `GET /portal/auth/me` |

## Internal app — Home, Command Center, Approvals, Notifications, Profile (Phase 1)

| Screen | Client | Endpoint(s) |
|---|---|---|
| Home (`features/home`) | `apiClient` | `GET /ai/command-center/summary` (Business Health, Attention, KPIs, approvals-pending count) |
| Command Center (`features/commandCenter`) | `apiClient` | `GET /ai/command-center/summary`, `GET/POST /ai/conversations[/…]`, `GET/POST /ai/action-proposals[/…]` |
| Approvals inbox / detail (`features/approvals`) | `apiClient` | `GET /approvals/inbox`, `GET /approvals/{id}`, `POST /approvals/{id}/decide` |
| Notifications (`features/notifications`) | `apiClient` | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |
| Profile / preferences (`features/profile`) | `apiClient` | `GET /localization/current` (bootstrap), **`POST /notifications/device-tokens`** (new, M18 — "Register this device") |
| Internal localization bootstrap (on login) | `apiClient` | `GET /localization/current` |

## Internal app — ERP modules (Phase 2)

| Module | Client | Endpoint(s) |
|---|---|---|
| CRM — leads (`features/crm`) | `apiClient` | `GET/GET {id} /crm/leads` |
| CRM — customers | `apiClient` | `GET/GET {id} /crm/customers`; Documents panel below |
| Sales — bookings (`features/sales`) | `apiClient` | `GET/GET {id} /sales/bookings` |
| Projects (`features/projects`) | `apiClient` | `GET/GET {id} /projects` |
| Property — properties/units/tenants/leases/maintenance (`features/property`) | `apiClient` | `GET/GET {id} /property/properties`, `/property/units`, `/property/tenants`, `/property/leases`, `/property/maintenance-requests` |
| Construction — expenses/work packages (`features/construction`) | `apiClient` | `GET/GET {id} /construction/expenses`, `/construction/work-packages` |
| Procurement — purchase orders/requests/vendors (`features/procurement`) | `apiClient` | `GET/GET {id} /procurement/purchase-orders`, `/procurement/purchase-requests`, `/procurement/vendors` |
| Facility — facilities/spaces/service requests/mall shops/coworking bookings (`features/facility`) | `apiClient` | `GET/GET {id} /facility/facilities`, `/facility/spaces`, `/facility/service-requests`, `/facility/mall-shops`, `/facility/coworking-bookings` |
| Documents panel (`features/documents`, embedded in CRM customer detail) | `apiClient` | `GET /documents?entityType=&entityId=`, `POST /documents` (multipart upload), `GET /documents/{id}`, `GET /documents/{id}/download` |

Every list above is server-paged (`usePagedList` → `PagedRequest`/`PagedResult`); none loads an
unbounded set into memory.

## Internal app — Agent self-service view (Phase 3; not a portal area — see below)

`AgentPortalController` is plain `[Authorize]` (staff auth, self-scoped to the caller's own
`UserId`), so its mobile screens (`app/(internal)/agent/`, Work tab → "My sales desk") use
`apiClient`, gated by the `sales.booking.view` permission — exactly how the web nav gates its
"Agent Portal" entry.

| Screen | Client | Endpoint(s) |
|---|---|---|
| My sales desk hub | `apiClient` | `GET /agent-portal/performance` |
| My leads | `apiClient` | `GET /agent-portal/leads` |
| My customers | `apiClient` | `GET /agent-portal/customers` |
| Available inventory | `apiClient` | `GET /agent-portal/available-inventory` |
| My bookings | `apiClient` | `GET /agent-portal/bookings` |
| My follow-ups | `apiClient` | `GET /agent-portal/follow-ups` |

## Portal app — five actor-type areas (Phase 3)

Every row below uses **`portalApiClient` only**. `/portal` redirects to the signed-in user's own
area from `profile.actorType`; each area's layout rejects any other actor type.

### Customer (`app/(portal)/portal/customer/`)

| Screen | Endpoint(s) |
|---|---|
| Home | `GET /portal/customer/bookings` (for totals/next installment, derived client-side from real rows — no separate summary endpoint exists) |
| Bookings list / detail | `GET /portal/customer/bookings`, `GET /portal/customer/bookings/{id}`, `GET /portal/customer/bookings/{id}/payment-plan`, `GET /portal/customer/bookings/{id}/payments` |
| Payment history | `GET /portal/customer/payments` |
| Documents | `GET /portal/customer/documents`, `GET /portal/customer/documents/{id}/download` |
| Notifications | `GET /portal/customer/notifications`, `GET /portal/customer/notifications/unread-count`, `POST /portal/customer/notifications/{id}/read`, `POST /portal/customer/notifications/read-all` |
| Account | **`POST /portal/device-tokens`** (new, M18 — "Register this device") |

### Tenant (`app/(portal)/portal/tenant/`)

| Screen | Endpoint(s) |
|---|---|
| Home | `GET /portal/tenant/leases` (next rent due / overdue, derived client-side) |
| Leases list / detail | `GET /portal/tenant/leases`, `GET /portal/tenant/leases/{id}`, `GET /portal/tenant/leases/{id}/rent-schedule`, `GET /portal/tenant/leases/{id}/security-deposit` |
| Rent payment history | `GET /portal/tenant/payments`, `GET /portal/tenant/leases/{id}/payments` |
| Maintenance requests list | `GET /portal/tenant/maintenance-requests` |
| **Report an issue (real write)** | `POST /portal/tenant/maintenance-requests` — real server-created record shown on success (number/status/location); real per-field validation errors shown on failure; disabled while offline, never queued |
| Documents / Notifications | same shape as Customer, under `/portal/tenant/*` |

### Owner (`app/(portal)/portal/owner/`)

| Screen | Endpoint(s) |
|---|---|
| Home / Rent & revenue | `GET /portal/owner/rent-collected`, `GET /portal/owner/overdue-rent`, `GET /portal/owner/revenue` (backend's default this-month-to-date range) |
| Properties list / detail | `GET /portal/owner/properties`, `GET /portal/owner/properties/{id}` |
| Maintenance (read-only) | `GET /portal/owner/maintenance-requests` |
| Documents / Notifications | same shape, under `/portal/owner/*` |

### Vendor (`app/(portal)/portal/vendor/`)

| Screen | Endpoint(s) |
|---|---|
| Home / Purchase orders list / detail | `GET /portal/vendor/purchase-orders`, `GET /portal/vendor/purchase-orders/{id}` |
| Assigned work | `GET /portal/vendor/assigned-work` |
| Documents / Notifications | same shape, under `/portal/vendor/*` (documents attached to the Vendor record, not per purchase order — see gap below) |

### CoworkingMember (`app/(portal)/portal/member/`)

| Screen | Endpoint(s) |
|---|---|
| Home / Membership | `GET /portal/member/membership`, `GET /portal/member/memberships` |
| Bookings list / detail | `GET /portal/member/bookings`, `GET /portal/member/bookings/{id}` |
| Documents / Notifications | same shape, under `/portal/member/*` |

## Push device registration (new, M18)

| Caller | Endpoint |
|---|---|
| Internal Profile → "Register this device" | `POST /api/v1/notifications/device-tokens` |
| Portal Account → "Register this device" | `POST /api/v1/portal/device-tokens` |

Both upsert a `DeviceRegistration` row keyed by `(TenantId, OwnerId, IsPortalOwner, Platform)` — a
re-registration updates the token in place rather than duplicating. Storing a token is the entire
scope: nothing reads these rows and sends a push (see `docs/MOBILE_ARCHITECTURE.md`'s "Push
notifications" section for the four-layer breakdown).

## Known API shape gaps hit during Phase 3 (not papered over)

- No `GET /portal/tenant/maintenance-requests/{id}` — the detail view is a sheet built from the
  already-fetched list row, not a second network call.
- `documents`, `payments` (customer/tenant), and owner `properties`/rent-revenue reports return
  plain arrays, not `PagedResult` — those specific screens are not server-paged (everything else
  in this document is).
- Vendor documents are scoped to the Vendor record itself, not per purchase order.
- CoworkingMember has no payment-history endpoint and no self-service booking-creation endpoint, so
  neither is offered in the mobile app.
- On web only, a downloaded document's file name falls back to the document's title rather than the
  server's `Content-Disposition` filename, which the browser does not expose cross-origin in this
  dev configuration; native iOS/Android downloads are unaffected (no such restriction applies there,
  though this was not device-verified — see the final report's TESTED/NOT IMPLEMENTED distinctions).

None of these gaps were worked around with invented endpoints or fabricated data; each is a real,
narrow scope boundary a future milestone can close if needed.
