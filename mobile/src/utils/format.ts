import { getTenantLocalization } from '@/i18n/tenantLocalization'

/**
 * Locale/currency-aware formatters — ports of `frontend/src/modules/reports/format.ts`'s `money()`
 * and `frontend/src/lib/utils.ts`'s `formatDate()`/`formatDateTime()`/`formatNumber()`. They read
 * the bootstrapped tenant `TenantLocalizationDto`, falling back to USD / the device locale before it
 * has loaded (or when the viewer can't read it). Never throw: Hermes' `Intl` coverage differs by
 * platform/version, so every call has a plain-string fallback.
 */

function resolveLocale(locale?: string): string | undefined {
  return locale ?? getTenantLocalization()?.locale ?? undefined
}

/** KPI/summary amounts, whole units, in the tenant's currency. */
export function money(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  const localization = getTenantLocalization()
  const currency = localization?.currency ?? 'USD'
  const locale = localization?.locale
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${Math.round(value).toLocaleString()} ${currency}`
  }
}

/** Itemized amounts — keeps the currency's minor units. */
export function moneyExact(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  const localization = getTenantLocalization()
  const currency = localization?.currency ?? 'USD'
  const locale = localization?.locale
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions, locale?: string): string {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat(resolveLocale(locale), options).format(value)
  } catch {
    return String(value)
  }
}

/** Date + time, e.g. "Jan 5, 2026, 3:00 PM" — matches the web `formatDateTime`. */
export function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return date.toLocaleString(resolveLocale(locale), { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16)
  }
}

/** Kept as an alias of `formatDateTime`, exactly like the web `formatDate`. */
export function formatDate(value: string | null | undefined, locale?: string): string {
  return formatDateTime(value, locale)
}

/** Today's date (YYYY-MM-DD) in the tenant's own timezone when known — the same calendar day the
 * backend's `ITenantTimeService` uses for report ranges — else the device's local date. */
export function tenantToday(): string {
  const timeZone = getTenantLocalization()?.timezone
  const now = new Date()
  if (timeZone) {
    try {
      // en-CA formats as YYYY-MM-DD.
      return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    } catch {
      // Unknown IANA zone on this runtime — fall through to the device date.
    }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** "crm.lead.assign" / "assign_lead" / "AssignLead" -> "Assign lead" (display-only), ported from the
 * web ActionProposalsSection. */
export function humanizeActionType(actionType: string): string {
  const last = actionType.split('.').filter(Boolean).pop() ?? actionType
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : actionType
}

/** Ported from the web JsonDataView: "totalNetPrice" -> "Total net price". */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
