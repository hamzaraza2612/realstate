/** Matches every other module's hardcoded en-US/$ money formatting (a documented, deferred
 * multi-currency gap — not addressed here). */
export function money(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
}

export function percent(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return `${value.toFixed(1)}%`
}

export function count(value: number | null | undefined) {
  if (value == null) return 'N/A'
  return new Intl.NumberFormat('en-US').format(value)
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
