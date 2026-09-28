# Country Packs & GCC Architecture (Milestone 15)

This document covers the "country pack" architectural pattern this milestone establishes, what's
actually complete for each country, and the extension points a future country pack plugs into. See
`docs/LOCALIZATION.md` for the tenant locale profile and `docs/TAX_ENGINE.md` for the tax engine
and eInvoice seam.

## The pattern

A "country pack" is not a single class or plugin registry — it's the combination of:

1. An entry in `Domain/Localization/CountryCatalog.cs` (ISO codes, default currency/locale/
   timezone/phone code — see `docs/LOCALIZATION.md`).
2. Zero or more `TaxProfile`/`TaxRate` rows for that country (see `docs/TAX_ENGINE.md`) — a country
   with none simply charges no tax by default (`ITaxCalculationService` degrades gracefully).
3. Optionally, a real `IEInvoiceProvider` implementation registered in place of
   `UnconfiguredEInvoiceProvider` (see `docs/TAX_ENGINE.md`) — not built for any country this
   milestone.
4. Optionally, a real rental-registry integration populating the nullable `Lease.External*` fields
   (see "Rental/Ejar integration seam" below) — not built for any country this milestone.

Adding a country that only needs #1 (a tenant can select it, see its currency/timezone default
correctly, and use the ERP with no tax charged) requires **zero code changes** — just one line in
`CountryCatalog`. Adding tax support for it is a platform-admin data-entry action
(`POST /api/v1/platform/tax-profiles` + `.../rates`), not a code change either. Only a real
eInvoice/rental-registry/payment integration requires writing a new adapter class — and that class
implements an existing interface, so nothing else in the ERP core changes to accommodate it.

## Status per country, honestly

| Country | Catalog entry | Tax profile seeded | eInvoice adapter | Rental-registry adapter |
|---|---|---|---|---|
| UAE (AE) | Yes | Yes — 5% standard + 0% zero-rated VAT | No (seam only) | No (seam only) |
| Saudi Arabia (SA) | Yes | Yes — 15% standard + 0% zero-rated VAT | No (seam only) | No (seam only) |
| Pakistan (PK) | Yes | No | No | No |
| United Kingdom (GB) | Yes | No | No | No |
| United States (US) | Yes | No | No | No |
| Qatar (QA) | Yes | No | No | No |
| Bahrain (BH) | Yes | No | No | No |
| Kuwait (KW) | Yes | No | No | No |
| Oman (OM) | Yes | No | No | No |

UAE and Saudi Arabia are the two "complete" packs this milestone delivers end to end (catalog +
tax). The remaining four GCC states (Qatar, Bahrain, Kuwait, Oman) are in the catalog specifically
to prove the architecture generalizes past just two countries — deliberately **not** given seeded
tax profiles, since inventing their VAT/tax treatment without being asked to would be exactly the
"fully implement every country's tax/legal rules" this milestone was told not to do. A platform
admin can add a tax profile for any of them at any time through the existing UI/API with no code
change.

## Saudi rental readiness (Ejar) — integration seam, not a fake integration

Saudi Arabia's Ejar platform (and equivalents in other markets) registers rental contracts with a
government system. `Lease` (`Domain/Property/Lease.cs`) gained four nullable columns:
`ExternalRegistryProvider` (e.g. `"ejar"`), `ExternalContractReference`,
`ExternalRegistrationStatus`, `ExternalLastSyncedAt`. **Nothing populates these** — no Ejar (or any
other registry's) API is called anywhere in this codebase. They exist purely as the shape a future
`IRentalIntegrationProvider` (not yet defined — the same generic-interface-over-country-specific-
adapter pattern as `IEInvoiceProvider` is the intended shape) would write into once a real
integration is built: contract reference, registration status, last-sync timestamp, tenant/landlord/
broker identity mapping, and payment synchronization are all realistic future fields once that
interface exists, but adding placeholder fields for capabilities with no concrete design yet would
be over-engineering, not architecture — so only the four fields with an obvious, unambiguous shape
were added now.

## GCC-wide extension points, summarized

| Concern | Extension point | Status |
|---|---|---|
| Tax rules | `TaxProfile`/`TaxRate` (platform data) + `ITaxCalculationService` | Working engine; UAE/Saudi seeded |
| Structured e-invoicing | `IEInvoiceProvider` | Seam only (`UnconfiguredEInvoiceProvider`) |
| Rental-registry sync | Nullable `Lease.External*` fields | Fields only, no provider interface yet |
| Payment processing | `IBillingPaymentProvider` (Milestone 14) | Seam only (`UnconfiguredBillingPaymentProvider`) |
| FX rates | `IExchangeRateService` | Manual entry only, no live provider |

None of these require modifying the ERP domain/core to plug in a real implementation — each is
either pure configuration data or a single interface substitution in `DependencyInjection.cs`.

## What is explicitly NOT implemented

- Live Ejar (or any other country's rental-registry) API integration.
- Full tax/legal rule implementation for Qatar, Bahrain, Kuwait, or Oman.
- Any government API call of any kind, for any country.
- Regulatory or legal compliance certification for any jurisdiction.
