# Localization Foundation (Milestone 15)

This document covers the localization architecture introduced in Milestone 15: tenant-level
country/currency/language/timezone configuration, the compile-time country/currency reference
catalogs, tenant-aware timezone handling, and the frontend i18n/RTL/formatting layer. It builds on
top of — and does not replace — the tenant model from Milestone 1, `Tenant.Timezone` from
Milestone 10, and the SaaS billing foundation from Milestone 14. The tax engine and e-invoicing
seam are covered separately in `docs/TAX_ENGINE.md`; the country-pack/GCC architecture is covered
in `docs/COUNTRY_PACKS.md`.

## Design principle: one global ERP, not a UAE-only product

Nothing in this milestone hardcodes a currency, VAT rate, phone format, or address shape. Every
country-specific value is either (a) plain per-tenant configuration data (`Tenant.CountryCode`,
`.Currency`, `.Locale`, ...), (b) a compile-time reference catalog anyone can extend by adding one
line (`CountryCatalog`, `CurrencyCatalog`), or (c) an explicit adapter/extension seam
(`ITaxCalculationService`, `IEInvoiceProvider`, `IExchangeRateService`) that a real country-specific
implementation would plug into later without changing the ERP core.

## Tenant localization profile

Rather than a separate one-to-one "profile" table, the localization fields live directly on
`Tenant` (`Domain/Tenancy/Tenant.cs`) — the tenant itself already *is* the single source of truth
for this configuration, so a second table would just be an extra join for no isolation benefit:

- `CountryCode` (ISO 3166-1 alpha-2, e.g. `"AE"`)
- `Currency` (ISO 4217, e.g. `"AED"`)
- `Locale` (BCP-47, e.g. `"en-AE"`, `"ar-SA"`)
- `Timezone` (IANA id — this is `Tenant.Timezone` from Milestone 10, reused as-is, not duplicated)
- `DateFormat` (a .NET custom date format string used by generated documents)
- `FirstDayOfWeek` (`System.DayOfWeek`)
- `DefaultLanguage` (ISO 639-1, e.g. `"en"`, `"ar"`)
- `SecondaryLanguages` (comma-separated ISO 639-1 codes the tenant additionally allows)
- `MeasurementSystem` (`Metric`/`Imperial`)

Defaults (`US`/`USD`/`en-US`/Imperial/Sunday) are deliberately neutral — no product bias toward any
one country. `CreateOrganizationRequest` accepts an optional `CountryCode` (+ optional `Currency`/
`Locale` overrides); when given, `OrganizationService.CreateAsync` fills the rest from
`CountryCatalog` unless the caller explicitly overrode them. Reading/updating a tenant's own
profile is exposed at `GET/PUT /api/v1/localization/current` (`ILocalizationService`), gated by the
existing `organizations.view`/`organizations.manage` permissions — no new permission was needed
since this is just another facet of the tenant's own organization profile. A platform admin can
also set any tenant's profile via `PUT /api/v1/platform/organizations/{id}/localization`.

This deliberately leaves room for a future **user-level** locale preference (e.g. a UK-based user
working inside a UAE tenant who wants dates in `en-GB` format) without any redesign: it would be an
additive, nullable override on `AppUser`, resolved after the tenant default — the same
override-then-fall-back-to-tenant-default shape entitlements already use (see `docs/SAAS_BILLING.md`).
No such override exists yet; every user currently sees their tenant's configured locale.

## Country and currency catalogs

`Domain/Localization/CountryCatalog.cs` and `CurrencyCatalog.cs` are **compile-time catalogs**, the
same pattern `Shared/Security/Permissions.cs` and `EntitlementCodes` already use. This is
deliberate: country/currency reference data (ISO codes, decimal precision, a sensible default
timezone) doesn't change at runtime and isn't tenant-editable, so a database table with seed-data
migrations would be pure overhead for ~10 static rows. Adding a new country or currency is a
one-line addition to the relevant dictionary, not a schema change.

Countries covered: UAE (AE), Saudi Arabia (SA), Pakistan (PK), United Kingdom (GB), United States
(US), Qatar (QA), Bahrain (BH), Kuwait (KW), Oman (OM) — the five the milestone spec named plus the
remaining GCC states, to prove the catalog (and the country-pack architecture in
`docs/COUNTRY_PACKS.md`) generalizes past just UAE/Saudi.

Currencies covered: AED, SAR, PKR, USD, EUR, GBP, QAR, BHD, KWD, OMR — each with its own
`DecimalPlaces` (2 for most; 3 for BHD/KWD/OMR, which do NOT use a hardcoded 2). Every place that
rounds a monetary amount for a specific currency (`ITaxCalculationService`, `IExchangeRateService`)
calls `CurrencyCatalog.Round(amount, currencyCode)` rather than assuming 2 decimal places — see
`docs/TAX_ENGINE.md`.

## Timezone handling

Every timestamp in this codebase was already stored as `DateTimeOffset` (an absolute instant, safe
regardless of timezone — this predates Milestone 15 and needed no change) or `DateOnly` (a plain
calendar date, e.g. a lease's `StartDate`). The actual risk this milestone's timezone audit
targeted was **calendar-day boundaries derived from `DateTime.UtcNow`** — e.g. "what date is
today" for an invoice's issue date, or a report's default date range — which, before this
milestone, always meant the *server's* UTC calendar day, not the tenant's.

`Shared/Common/TenantClock.cs` is a small, pure, fully unit-tested helper
(`TenantClockTests.cs` covers Asia/Dubai, Asia/Riyadh, Asia/Karachi, Europe/London, and
America/New_York) that converts a UTC instant to a calendar date in a given IANA timezone, falling
back to UTC for an unrecognized/empty timezone id rather than throwing.
`Application/Common/Interfaces/ITenantTimeService` (`Infrastructure/Services/TenantTimeService.cs`)
wraps this with a `Tenant.Timezone` lookup — either the ambient tenant (`TodayAsync`/
`GetTimezoneAsync`) or an explicit tenant id (`TodayForTenantAsync`/`GetTimezoneForTenantAsync`, for
platform-admin operations acting on a tenant that isn't the caller's own).

Applied at the two points this concretely mattered:
- **Invoice generation** (`InvoiceService.GenerateAsync`): `IssuedDate`/`DueDate` are now computed
  in the invoice's own tenant's local calendar day, not the server's UTC day — verified live: an
  invoice generated at 21:36 UTC for a UAE (Asia/Dubai, UTC+4) or Saudi (Asia/Riyadh, UTC+3) tenant
  correctly shows the *next* calendar day as its issue date.
- **Reporting default date ranges** (`Application/Reporting/Common/ReportDateRange.cs`): its
  `Resolve` method now takes an explicit `today` parameter (computed by the caller via
  `ITenantTimeService.TodayAsync`) instead of computing `DateOnly.FromDateTime(DateTime.UtcNow)`
  internally — every report service that resolves a default date range
  (`PropertyReportService`, `SalesReportService`, `FinanceReportsExtensionService`,
  `FacilityReportService`, `ExecutiveDashboardService`) was updated to pass it. The same services'
  own "today" locals for overdue/aging calculations (`OverdueRentAsync`, `TenantAgingAsync`,
  `GetArAgingAsync`, `GetApAgingAsync`, `MaintenanceBacklogAsync`) were updated the same way.

**What the audit found and did *not* need to change:** a full repository grep for `DateTime.Now`/
`DateTime.Today` (server-local time, the genuinely dangerous pattern) found **zero matches** —
every date/time computation in this codebase already used `DateTime.UtcNow`/`DateTimeOffset.UtcNow`
consistently. `SubscriptionLifecycleJob`'s trial-expiry check compares `DateTimeOffset` instants
directly (`TrialEndsAt <= now`), which is correct and timezone-agnostic by construction — it needed
no change. Rent/installment schedule generation operates on `DateOnly` arithmetic seeded from a
lease's own `StartDate`, with no dependency on the server's clock — also already correct.

**Known, deliberately-scoped limitation:** a small number of report queries convert a resolved
`DateOnly` range into a UTC instant window (e.g. `SalesReportService.BookingConversionAsync`,
filtering `Lead.CreatedAt`) using UTC midnight as the boundary, not the tenant's own UTC offset.
This means a lead created very close to midnight in a non-UTC timezone could, in rare cases, be
attributed to the adjacent calendar day in that one report. This is a pre-existing, narrow
precision issue (not a data-loss or security issue) that this milestone did not fully eliminate;
fixing it fully would mean threading tenant-timezone-aware instant-range conversion through every
report using this pattern, which was judged out of proportion to this milestone's scope. Tracked
as a known follow-up, not silently ignored.

## Frontend: i18n, RTL, and centralized formatting

See the frontend agent's own handback notes (also folded into `docs/ROADMAP.md`'s Milestone 15
entry) for exactly what was built: a dependency-free i18n context (`en`/`ar` resource
dictionaries, language persisted client-side, `dir` reactively applied to `<html>`), a
`localizationStore` that loads the tenant's current locale/currency/timezone once per session, a
Settings → Localization page (country/currency/language/timezone/date-format/first-day-of-week/
measurement-system form with a live preview and a read-only tax-configuration panel), and a fix to
the pre-existing hardcoded `$`/`en-US` `money()` helper used by every dashboard page so it now
reads the tenant's own currency/locale.

## What is explicitly NOT implemented

- Per-user locale overrides (see above — the extension point exists, nothing populates it yet).
- A live external FX rate provider (see `docs/TAX_ENGINE.md`'s exchange-rate section).
- Full-application Arabic translation or a full RTL audit of every existing page (only the
  persistent app shell — Sidebar/top bar — and the new Localization Settings page were verified
  RTL-correct this milestone; M17 is the dedicated premium UI/UX milestone where the rest of the
  ~100-page app would be visited).
- Postal-code or phone-number format validation (see `docs/COUNTRY_PACKS.md`).
