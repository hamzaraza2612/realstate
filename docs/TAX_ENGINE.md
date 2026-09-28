# Tax Engine, eInvoicing Seam & Finance/Currency Strategy (Milestone 15)

This document covers the configurable tax engine, the tenant tax-registration model, the
generic e-invoice provider seam, the manual FX rate seam, and the Finance-module currency
strategy introduced in Milestone 15. See `docs/LOCALIZATION.md` for the tenant locale profile and
`docs/COUNTRY_PACKS.md` for the GCC country-pack architecture.

## Why a tax engine, not a hardcoded percentage

Before this milestone, nothing in the codebase computed tax at all (Invoice generation took an
explicit `TaxAmount` typed in by a platform admin). The requirement was specifically to avoid
`VAT = 5` or `VAT = 15` inside business logic, support exemptions/zero-rating, and make a rate
change never rewrite history. That shape is `TaxProfile` + `TaxRate`, not a single number:

- **`TaxProfile`** (`Domain/Localization/TaxProfile.cs`) — a named tax scheme for one country (e.g.
  "UAE VAT"). Platform-level reference data (`BaseEntity`, not tenant-owned) — the same "one Super
  Admin-managed catalog every tenant reads" shape as `SubscriptionPlan`. Fields: `CountryCode`,
  `Code` (unique, stable, e.g. `"AE_VAT"`), `Name`, `Description`, `IsActive`.
- **`TaxRate`** — a versioned rate under a profile, e.g. `"STANDARD"` at 5%, `"ZERO_RATED"` at 0%.
  Fields: `RateCode`, `Name`, `Percentage`, `IsInclusive`, `EffectiveFrom`/`EffectiveTo`, `IsActive`.
  This is what makes "UAE VAT isn't a flat 5% on everything" representable: a real deployment can
  add `"EXEMPT"` or a reduced rate as another `TaxRate` row under the same profile, without any code
  change.

Only a platform admin can create/edit `TaxProfile`/`TaxRate` rows (`ITaxProfileService`, exposed at
`/api/v1/platform/tax-profiles`, gated by the existing `PlatformControllerBase`/`SuperAdminOnly`
policy — no tenant token can ever reach this). A tenant can only *read* the active rates for its own
country (`GET /api/v1/localization/tax-rates?countryCode=...`, no special permission — non-sensitive
reference data) and optionally record which profile applies to it plus its own registration details
(see "Tenant tax registration" below) — never edit the catalog itself.

## Calculation: `ITaxCalculationService`

`Infrastructure/Services/Localization/TaxCalculationService.cs` is the **only** place a tax amount
is computed. `CalculateAsync(countryCode, rateCode, amount, asOf)`:

1. Looks up the `TaxRate` for that country + rate code (defaulting to `"STANDARD"` if none given)
   whose `EffectiveFrom <= asOf <= EffectiveTo` (or `EffectiveTo` is null). Ties (e.g. two active
   profiles for one country) are broken by most-recently-created, so the result is always
   deterministic rather than depending on database row order.
2. If none is found, returns `Applied = false` with zero tax — a deliberate, non-blocking default:
   not every tenant/country/transaction has an applicable tax (e.g. Pakistan has no seeded profile
   this milestone — see `docs/COUNTRY_PACKS.md`), and a SaaS subscription invoice charging no tax is
   a perfectly valid state, not an error.
3. If found, computes `TaxAmount`/`Subtotal`/`Total` respecting `IsInclusive` (back out the tax
   from an inclusive amount rather than adding on top) and rounds using `CurrencyCatalog.Round`
   (the currency's own decimal precision — never a hardcoded 2 places).

Given the same inputs, this always returns the same result — that's what makes the result safe to
snapshot.

## Historical snapshot: why changing a rate never rewrites an invoice

`Invoice` (`Domain/Billing/Invoice.cs`) gained five nullable columns: `TaxRateId`, `TaxCode`,
`TaxName`, `TaxPercentage`, `TaxInclusive`. `InvoiceService.GenerateAsync` accepts an optional
`GenerateInvoiceRequest.TaxRateCode`; when supplied, it calls `ITaxCalculationService.CalculateAsync`
once, at generation time, and copies every one of those five values onto the new `Invoice` row.
`TaxRateId` is kept only for traceability (e.g. "which rate did this apply") — nothing ever re-reads
the referenced `TaxRate` to re-derive `TaxAmount`/`TaxPercentage` later. Raising a `TaxRate`'s
`Percentage` (or superseding it with a new row and closing the old one out via `EffectiveTo`) can
never change what an already-issued invoice shows, because the invoice doesn't ask again — verified
live and by a dedicated integration test (`ChangingTaxRatePercentage_NeverChangesAnAlreadyIssuedInvoicesSnapshot`)
that generates an invoice, changes the rate, re-fetches the same invoice (unchanged), and generates
a second invoice (reflecting the new rate).

When `TaxRateCode` is omitted, `GenerateInvoiceRequest.TaxAmount` is used as-is (Milestone 14's
original manual-entry behavior, preserved for a country with no configured tax profile, or a
platform admin who wants to type a figure directly) — no tax snapshot fields are set in that case.

## Tenant tax registration

`TenantTaxProfile` (`Domain/Localization/TenantTaxProfile.cs`) — one row per tenant, created lazily
on first save — holds `TaxProfileId` (which platform `TaxProfile` this tenant is registered under,
nullable), a generic `TaxRegistrationNumber` (deliberately not named "Trn": the same field
represents a UAE TRN, a Saudi VAT number, or any future country's equivalent — which one it *means*
is determined by the linked `TaxProfile`'s country, not the field name), and legal-entity/address
fields (`LegalEntityName`, `LegalAddressLine1/2`, `LegalCity`, `LegalStateOrProvince`,
`LegalPostalCode`, `LegalCountryCode`). Exposed tenant-side at `GET/PUT /api/v1/localization/tax-profile`.
This is separate from the tenant's display/locale profile (`docs/LOCALIZATION.md`) because it's
optional, filled in over time, and about tax/legal identity rather than UI presentation.

## eInvoice provider seam — architecture only, no live integration

The UAE and Saudi Arabia are both moving toward mandatory structured electronic invoicing (UAE:
future Accredited Service Provider model; Saudi: ZATCA/FATOORA). `IEInvoiceProvider`
(`Application/Localization/EInvoiceDtos.cs`) is **one generic interface**, not one per country —
`SubmitAsync`/`ValidateAsync`, taking an `EInvoiceSubmissionRequest { InvoiceId, DocumentType }`
(Invoice/CreditNote/DebitNote) and returning a provider-agnostic result. A future UAE-ASP adapter and
a future Saudi-ZATCA adapter would both just be implementations of this same interface — the ERP
core never branches on country to decide *how* to submit, only *whether* one is configured.

`EInvoiceSubmission` (`Domain/Localization/EInvoiceSubmission.cs`) is the audit trail: one row per
submission attempt, with `Status` (Pending/Submitted/Accepted/Rejected/Failed/Retrying),
`ExternalReference`, `ProviderResponseJson`, `ErrorDetails`, `RetryCount`. Exposed at
`GET/POST /api/v1/platform/invoices/{id}/einvoice-submissions`.

**The only registered implementation is `UnconfiguredEInvoiceProvider`**, which always fails
cleanly with `einvoice_provider_not_configured` — mirroring Milestone 14's
`UnconfiguredBillingPaymentProvider` exactly. Nothing in this milestone calls a real UAE ASP or
ZATCA/FATOORA endpoint. **This codebase does not claim UAE eInvoicing or ZATCA/FATOORA
compliance** — only that the invoice model and provider boundary are shaped to accept a real
adapter later without a schema or core-logic change.

This is deliberately kept separate from ordinary PDF invoice generation (`IInvoiceService`) — a
PDF rendering of an invoice for a customer to read and a structured eInvoice submission to a
government-accredited provider are different concepts and are never conflated here.

## Exchange rates — manual seam only, never invents a rate

`ExchangeRate` (`Domain/Localization/ExchangeRate.cs`) is platform-wide reference data (an FX rate
is a fact about the world, not something one tenant can have a different value for than another):
`BaseCurrency`, `QuoteCurrency`, `Rate`, `EffectiveAt`, `Source` (always `"manual"` this milestone),
`IsActive`. `IExchangeRateService.ConvertAsync`:

- Same-currency conversion is always the identity — no lookup, nothing to invent.
- A direct `(base, quote)` rate row is used when present (most recent `EffectiveAt <= asOf`).
- If only the reverse pair was ever recorded, the inverse (`1 / rate`) is used — still an exact,
  derived value, not an invented one.
- Otherwise, it fails clearly with `exchange_rate_not_found` rather than guessing — verified by a
  dedicated test.

No external FX provider is integrated this milestone; `SetRateAsync` (`POST /api/v1/platform/exchange-rates`)
is how a platform admin records a rate by hand. This is not wired into billing/invoicing this
milestone (every invoice bills in its subscription's own currency; no automatic conversion is
needed) — it exists as a tested, working foundation for a future live provider or a future
cross-currency reporting rollup.

## Finance & currency strategy — why most tables gained no new column

Milestone 15 asked explicitly not to "blindly add currency columns to every table." The existing
ERP finance/business tables (`Account`, `JournalEntry`, `FinancialDocument`, Sales `Payment`,
Property `RentPayment`, Facility `FacilityPayment`) had **no currency column at all** before this
milestone — every amount was implicitly in whatever currency the tenant operates in. Since a
tenant now has exactly one operating currency (`Tenant.Currency`), and all of that tenant's
ERP-module rows are already isolated to it by the existing tenant query filter, `Tenant.Currency`
**is** the transaction currency for every one of those tables, with no ambiguity and no per-row
column needed — adding one would duplicate a value that's already implied by `TenantId`.

This differs from the SaaS billing subsystem (`Invoice`, `Subscription`, `BillingPayment`), which
**does** carry an explicit `Currency` per row — correctly, since those are platform-level entities
that span many tenants with potentially different currencies, so the currency genuinely varies row
to row within the same table.

There is currently no distinction between "transaction currency" and a separate "base/reporting
currency" anywhere in the ERP core, because nothing aggregates amounts *across* tenants (each
report/dashboard query is already tenant-scoped by the standard query filter) — introducing that
distinction now, with no consumer for it, would be exactly the "full multinational accounting
suite" this milestone was told not to build. If a future milestone needs a tenant to bill some of
its own customers in a currency other than its own operating currency (e.g. a UAE tenant invoicing
a USD-paying customer), that would be the trigger to add an explicit per-transaction currency
column plus `IExchangeRateService`-backed conversion to the tenant's base currency for reporting —
the seam for that already exists and is tested, it's just not wired into the ERP core yet.

## Reporting: never mixing currencies

Every report/dashboard query in this codebase is already scoped to a single tenant (via the
standard `TenantEntity` query filter), and a tenant has exactly one `Currency` — so no report can
currently sum amounts from two different currencies, because there is only ever one currency in
scope for any given tenant's report. Verified live and by a dedicated integration test
(`Invoices_AcrossDifferentCurrencyTenants_EachKeepTheirOwnCurrency_NeverMixed`) that generates
invoices for a UAE and a Pakistan tenant and confirms each keeps exactly its own currency with no
cross-tenant aggregation. The platform-level cross-tenant invoice list
(`GET /api/v1/platform/invoices`) is a flat list of individually-currencied rows — it does not sum
a "total" figure across tenants, so there is nothing to silently mix.

## What is explicitly NOT implemented

- Live UAE Accredited Service Provider integration.
- Live ZATCA/FATOORA integration (Saudi Arabia).
- A live external FX rate provider.
- Regulatory/legal tax-compliance certification of any kind — this is architecture, not tax advice.
- A UI for a tenant's own `TenantTaxProfile` (registration number/legal entity/address) — the
  `GET/PUT /api/v1/localization/tax-profile` endpoints and their frontend API hooks exist, but no
  page consumes them yet; the natural home is a "Legal & Tax Registration" card on the Settings →
  Localization page.
- A platform-admin UI for viewing/editing another tenant's *full* localization profile beyond
  country/currency/locale/timezone: `PlatformOrganizationDetailPage`'s Localization tab can't
  pre-fill `dateFormat`/`firstDayOfWeek`/`measurementSystem` with a tenant's actual saved values,
  because no platform endpoint currently returns another tenant's full `TenantLocalizationDto` (only
  `OrganizationDto`'s four summary fields — see `docs/LOCALIZATION.md`). A real, narrow gap, not a
  frontend bug: closing it means adding a platform-scoped read endpoint, e.g.
  `GET /api/v1/platform/organizations/{id}/localization`.
- A platform admin UI for the manual exchange-rate seam (`IExchangeRateService` and its API hooks
  exist and are tested; no `/platform/exchange-rates` page was built this milestone).
