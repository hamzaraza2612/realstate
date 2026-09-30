# UX Audit & Design System (Milestone 17)

M17 is a polish milestone, not a feature milestone: this document inventories the existing frontend
(26 module folders, ~206 `.tsx` files, ~100 authenticated routes across CRM/Sales/Projects/Inventory/
Finance/Construction/Procurement/Property/Rental/Facility/Mall/Coworking/Documents/Notifications/
Approvals/Reports/6 External Portals/SaaS Admin/Billing/Localization/AI Command Center), records the
real, high-impact inconsistencies found, and reports what was actually fixed vs. deliberately deferred.
It intentionally does **not** call for rewriting stable, correct pages just because a pattern differs
slightly — see "What this milestone deliberately did NOT do" at the end.

## Method

Every finding below is backed by a direct code inspection or a repository-wide search, not a general
impression — each row names the exact files/counts found, independently re-verified by grep after
implementation (not just taken on the implementer's word) rather than assumed from a summary.

## Findings and outcomes (P0 = security/usability blocker, P1 = major workflow friction, P2 = visual inconsistency, P3 = nice-to-have)

| # | Area | Finding | Priority | Outcome |
|---|---|---|---|---|
| 1 | Global shell | Sidebar was `hidden … md:flex` with **no mobile replacement at all** — below the `md` breakpoint the entire authenticated app had zero navigation. | **P0** | **Fixed.** A mobile header with a `Sheet`-based nav drawer (hamburger → the identical nav tree) now appears below `md`; verified live via Playwright screenshot at 375px width, both English and Arabic (drawer correctly opens from the RTL-correct edge in Arabic). |
| 2 | Executive experience | Root `/` rendered the literal Milestone-1 placeholder dashboard (four shortcut cards + a comment admitting it's a placeholder), while the real M12 `ExecutiveDashboardPage` was buried under `/reports`. | **P0** | **Fixed.** Root dashboard now shows real KPI cards (sales/collections/profit/cash/receivables/occupancy/construction progress/maintenance backlog) via the existing `useExecutiveDashboard` hook, with a link to the full `/reports` page. Live-verified: a fresh UAE tenant's dashboard shows real `AED` figures, not placeholders. |
| 3 | Destructive actions | `ConfirmDialog` existed but was used in only 10 files; 7 files mutated data immediately with zero confirmation, including `ChartOfAccountsPage`'s account delete (real financial data). | **P0** | **Fixed.** All 7 named files (`HierarchyTree`, `ActivityList`, `JournalEntryDetailPage`, `ChartOfAccountsPage`, `TaskDetailPage`, `ExpensesPage`, `WorkPackageDetailPage`) now confirm with entity-specific copy, not "Are you sure?". Two additional one-way status changes (cancelling a construction task/work package) were also given confirmation on the implementer's own initiative, beyond the named list. |
| 4 | Component duplication | 11 separate hand-copied `StatCard` implementations, one per module dashboard. | **P1** | **Fixed.** One `StatCard` promoted to `components/common/`; all 11 call sites (10 module dashboards + the root dashboard) now import it. Verified: `grep -rl "function StatCard" src/modules` returns zero results. |
| 5 | Status display | 72 files defined their own ad-hoc `statusVariant`/`statusColor` map — the same status (e.g. "Approved") could render a different color on different pages. | **P1** | **Partially fixed, independently re-verified.** A single `StatusBadge` primitive (text + color, i18n-aware, one tone map) now exists and is used in 33 files, covering Approvals, Bookings, Leads, Command Center (Phase 1) plus all of the 6 external portals, SaaS admin, billing, and Leases/Invoices/Subscriptions (Phase 2) — i.e. every customer/tenant-facing and SaaS-admin-facing surface. **43 files still have their own ad-hoc map**, all of them in core internal ERP modules not in either phase's scope (Facility, Mall, Coworking, Procurement, Construction non-dashboard pages, Property units/maintenance, Inventory, Finance Journal/Receivables, some Reports pages) — a scoped, mechanical follow-up, not silently dropped. |
| 6 | Tables/pagination | 47 files duplicated the "Page X of Y · Previous/Next" markup and its `Math.ceil` computation. | **P1** | **Partially fixed, independently re-verified.** A shared `Pagination` component now exists and is used in 23 files (the highest-traffic core-ERP lists from Phase 1, plus every portal/SaaS-admin/billing list from Phase 2). 25 files still hand-roll the Previous/Next markup (the `Math.ceil` computation itself is fine and expected to remain — even migrated pages still compute `totalPages` to pass into `<Pagination>`; what was counted is files that still render their own buttons instead of the shared component) — same category of core-internal-ERP follow-up as item 5. |
| 7 | Empty states | `EmptyState` had no action slot — every "no data yet" screen was a dead end. | **P1** | **Fixed** (for the highest-traffic pages). `EmptyState` now accepts an optional `action` prop; wired into Leads, Customers, Bookings, Properties, Projects, Vendors, Organizations, Invoices, Subscription Plans, Tax Profiles, and Leases. |
| 8 | Design system gaps | No `Skeleton`, `Tooltip`, `Switch`, `Command`(bar), or `Sheet` primitive existed; no global search/command bar anywhere. | **P0/P1** | **Fixed.** `Skeleton`, `Switch`, `Tooltip`, `Sheet`, `Command` (cmdk-based) all added and building cleanly. A Ctrl+K/Cmd+K command bar was built covering BOTH page navigation (every nav route, fuzzy-filterable) AND live entity search (leads/customers, debounced against the real API) — live-verified: typing "balance" navigates to the Balance Sheet report, typing "john" surfaces matching leads/customers and navigates to the correct detail page. It has zero dependency on the AI provider — pure client-side route matching plus ordinary REST calls, never an LLM call, exactly as required. A `DatePicker`/`DateRangePicker` calendar widget was deliberately NOT built (see "deliberately did NOT do" below) — every date filter still uses native `<input type="date">`, which is accessible and functional. |
| 9 | i18n coverage | Only 124 keys existed in `en.ts`/`ar.ts` combined. | P2 | **Extended, not completed** (unchanged scope decision from M15, re-confirmed rather than silently left open). 285 keys now exist in each of `en.ts`/`ar.ts` (verified equal key counts in both), covering navigation, the new shell/command bar/status vocabulary, and Command Center strings. Most historical page body copy remains untranslated by design. |
| 10 | AI Command Center | Structurally sound (M16) but visually first-pass. | P2 | **Polished.** `StatusBadge` now used for action-proposal status; Business Health tiles get a colored side stripe matching the shared status palette. No structural/data-flow changes. |
| 11 | Portal currency (found *during* M17 execution, not in the original pass) | The currency-formatting fix correctly replaced every hardcoded `$` in the 6 portals with the shared `money()` helper — but portal sessions have no route to the tenant's real currency (`money()` reads a store only ever populated from the staff-only `GET /localization/current`), so every portal amount was silently still rendering as USD regardless of the tenant's actual currency. | **P1** | **Fixed** (small, scoped backend addition, per the milestone's own allowance for backend changes needed for "missing display data"). Added `GET /api/v1/portal/localization` — a read-only, portal-auth-only endpoint (any actor type) reusing the existing `ILocalizationService` — and bootstrapped the same shared localization store from it in `PortalLayout`. Live-verified end to end against a UAE tenant: a portal customer's dashboard now shows "AED 0", not "$0"; the internal staff-only endpoint still correctly rejects the portal token (403); the new endpoint rejects both unauthenticated (401) and internal-staff (403) requests. Full backend suite re-run: 287/287 passing. |
| 12 | Currency/date formatting (internal ERP) | Fixed in M15; re-verified still consistent. | — (verified only) | No regression found in the internal app; the portal gap (item 11) was the only real regression. |

## Design system (established in M17)

No second UI framework was introduced — everything is Tailwind + the existing shadcn/ui primitives
(Radix underneath).

**New primitives** (`components/ui/`): `skeleton.tsx`, `switch.tsx`, `tooltip.tsx`, `sheet.tsx`,
`command.tsx` (needs `cmdk` + `@radix-ui/react-switch` + `@radix-ui/react-tooltip`, all added to
`package.json`).

**New primitives** (`components/common/`): `StatusBadge.tsx`, `StatCard.tsx` (promoted from
`modules/reports/components/`), `Pagination.tsx`, `CommandBar.tsx`. `EmptyState` extended with an
optional `action` prop; `ConfirmDialog` extended with an optional `cancelLabel` prop.

**New primitive** (`components/portal/`, minor): `portal/shared/PortalStatCard.tsx` — a clickable
`StatCard` wrapper shared across all 5 external-portal dashboards (Customer/Tenant/Owner/Vendor/
Member), replacing 5 more hand-copied local components discovered during the portal pass.

**Navigation model**: `navItems`/`platformNavItems` moved into one shared
`components/layout/navigation.ts`, now grouped into **Home**, **Command Center**, **ERP**, **Reports**,
**Administration** sections and consumed identically by the desktop Sidebar, the mobile drawer, and
the command bar — so all three always show the exact same, identically-permissioned destinations. The
permission-filtering logic itself (`!item.permission || hasPermission(item.permission)`) is
byte-for-byte unchanged from before this milestone; only the rendering groups items under section
headers instead of one flat list.

**Visual language** (documented, not reinvented — mostly what the app already did; a few real gaps
closed):
- Typography: page title `text-xl font-semibold tracking-tight` (`PageHeader`), section headers
  `text-sm font-medium`, body `text-sm`, muted text `text-sm text-muted-foreground`.
- Spacing: `mb-6` under `PageHeader`, `gap-4` grid/flex rhythm throughout.
- Radius/shadow: shadcn defaults (`rounded-lg` cards, subtle borders, no heavy shadows) — kept
  deliberately flat/professional.
- Status colors: exactly the 5-tone palette `StatusBadge` centralizes (success/warning/danger/info/
  neutral), each with explicit light/dark color pairs for contrast; every status renders text **and**
  color, never color alone.
- Icons: `lucide-react` at `h-4 w-4`/`h-5 w-5` consistently; RTL-aware icon mirroring added where
  directional (e.g. arrow icons use `rtl:rotate-180`).

## Responsive strategy

- `< md`: mobile header + `Sheet` nav drawer (item 1). Some tables (e.g. Chart of Accounts) adapt by
  hiding lower-priority columns at narrow widths rather than horizontal-scrolling — verified live via
  screenshot, reads cleanly with no clipping.
- `md`–`lg`/`≥ lg`: existing `sm:`/`lg:` grid breakpoints were left as-is (already sensible); spot
  checked via live screenshots at 1440px and 375px for the dashboard, Chart of Accounts, and both
  portals, not exhaustively re-audited page by page.

## Accessibility

- Radix (Dialog/DropdownMenu/Select/Tabs/Tooltip/Sheet) provides focus trapping and keyboard handling
  by construction.
- `StatusBadge` renders text, never a color-only dot.
- `CommandBar` is keyboard-operable (Ctrl+K/Cmd+K, arrow keys + Enter, Escape) with `cmdk`'s built-in
  focus handling — live-verified.
- A full manual screen-reader pass across all ~100 routes was out of scope; the primitives touched
  here were checked, not the entire historical page inventory.

## RTL / Arabic

M15 established functional RTL; M17 verified the new work under it, live, via Playwright screenshots
in Arabic: the mobile nav drawer opens from the correct (right) edge, the command bar shows Arabic
placeholder text, `StatusBadge` labels translate for the common vocabulary, table columns and
pagination controls mirror correctly, and the root dashboard's RTL layout (sidebar on the right,
right-aligned KPI cards) renders cleanly with no clipping or overlap. No duplicated page
implementation was created for RTL anywhere — the single-implementation + logical-CSS-property
approach from M15 is unchanged.

## What this milestone deliberately did NOT do

- Migrate the remaining 43 ad-hoc status-badge call sites or 25 hand-rolled pagination footers (items
  5-6) — real, scoped, low-risk follow-up work, not hidden.
- Build a custom calendar/date-picker widget — the native date inputs are functional, accessible, and
  already localized; a new interactive calendar is exactly the "more surface area, more risk" work
  this milestone's own brief warns against.
- Any backend rewrite of a domain entity, API contract, approval engine, entitlement system, AI tool
  registry, or tenant-isolation mechanism. The one backend addition made (item 11, the portal
  localization endpoint) is a new, small, read-only, additive endpoint — nothing existing was changed.
- Full-application i18n coverage beyond navigation/common actions/Command Center — unchanged scope
  decision carried from M15.
- Add any UI affordance for a capability the backend doesn't support (no "Pay with Stripe", "Export
  Excel", "Connect Ejar", or plan self-service buttons anywhere) — verified against each touched
  module's own `api.ts` before adding any new button.
