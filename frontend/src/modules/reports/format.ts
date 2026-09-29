import { useLocalizationStore } from '@/stores/localizationStore'

/** Currency- and locale-aware money formatter (Milestone 15) — reads the tenant's own currency
 * and locale from the localization store instead of hardcoding `$`/`en-US`, the same approach as
 * `lib/utils.ts`'s `formatCurrency`. Falls back to USD/browser-default only when the localization
 * store hasn't loaded yet (e.g. this page rendered before `AppShell`'s bootstrap fetch resolved,
 * or the viewer has no tenant localization profile at all) — never throws. */
export function money(value: number | null | undefined) {
  if (value == null) return 'N/A'
  const localization = useLocalizationStore.getState().data
  const currency = localization?.currency ?? 'USD'
  const locale = localization?.locale
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale).format(value)} ${currency}`
  }
}

/** Same tenant currency/locale as `money()`, but keeps the currency's minor units (e.g. cents) —
 * for itemized amounts (installments, receipts, rent-schedule rows, PO lines) where rounding to
 * whole units would misstate what is actually owed or paid. `money()` stays the choice for KPI
 * totals and summary figures. */
export function moneyExact(value: number | null | undefined) {
  if (value == null) return 'N/A'
  const localization = useLocalizationStore.getState().data
  const currency = localization?.currency ?? 'USD'
  const locale = localization?.locale
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${currency}`
  }
}

export function percent(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return `${value.toFixed(1)}%`
}

export function count(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat(useLocalizationStore.getState().data?.locale).format(value)
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Formats a `{ year, month }` pair (1-12) from a report's monthly grouping into "Jan 2026". */
export function monthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`
}

/**
 * Report endpoints serialize `Record<Enum, number>` dictionaries with the enum's C# NAME as
 * the JSON key (e.g. "ProposalSent"), not its numeric value — so a plain numeric label map
 * lookup doesn't apply. This resolves a name back to that enum's own label map entry.
 */
export function labelForEnumName<T extends Record<string, number>>(
  enumObj: T,
  labelMap: Record<number, string>,
  name: string,
): string {
  const value = enumObj[name as keyof T]
  return value !== undefined ? (labelMap[value as number] ?? name) : name
}
