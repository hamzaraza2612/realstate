import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useLocalizationStore } from '@/stores/localizationStore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Resolves the locale to format with: an explicit override wins, else the tenant's own locale
 * from the localization store (Milestone 15 — see stores/localizationStore.ts) once it has
 * loaded, else `undefined` (the browser/runtime default) — every formatter below is safe to call
 * before the store has loaded, or for a caller with no tenant context at all (e.g. a platform-only
 * Super Admin). Never throws. */
function resolveLocale(locale?: string): string | undefined {
  return locale ?? useLocalizationStore.getState().data?.locale ?? undefined
}

/** Date + time, e.g. "Jan 5, 2026, 3:00 PM". This is `formatDate`'s long-standing behavior kept
 * unchanged for the ~100 existing call sites (due dates, timestamps, audit logs, …) — see
 * `formatDate` below, now just a locale-aware alias of this. */
export function formatDateTime(value: string | null | undefined, locale?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString(resolveLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDate(value: string | null | undefined, locale?: string) {
  return formatDateTime(value, locale)
}

/** Currency-aware money formatter — always uses the record's own `currency` field (ISO 4217),
 * never a hardcoded `$`/USD, since Milestone 14's plans/subscriptions/invoices are deliberately
 * currency-agnostic (see docs/SAAS_BILLING.md). `locale` defaults to the tenant's own locale
 * (Milestone 15) once available. */
export function formatCurrency(amount: number | null | undefined, currencyCode: string, locale?: string) {
  if (amount == null) return '—'
  try {
    return new Intl.NumberFormat(resolveLocale(locale), { style: 'currency', currency: currencyCode }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

/** Locale-aware plain number formatting (Milestone 15) — e.g. thousands separators that follow
 * the tenant's own locale rather than always being US-style. */
export function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions, locale?: string) {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat(resolveLocale(locale), options).format(value)
  } catch {
    return String(value)
  }
}

/** Formats a percentage VALUE already expressed on a 0-100 scale (e.g. `45.2` -> "45.2%"), matching
 * the existing convention in modules/reports/format.ts's `percent()` — never a 0-1 fraction. */
export function formatPercentage(value: number | null | undefined, options?: Intl.NumberFormatOptions, locale?: string) {
  if (value == null) return '—'
  try {
    return new Intl.NumberFormat(resolveLocale(locale), { style: 'percent', maximumFractionDigits: 1, ...options }).format(value / 100)
  } catch {
    return `${value.toFixed(1)}%`
  }
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return initials.join('') || '?'
}
