import type { ComponentProps } from 'react'
import { StatCard } from '@/components/common/StatCard'

/** The shared `StatCard` KPI tile, made clickable for the portal dashboards: each figure
 * deep-links to the page behind it (e.g. "Outstanding balance" → Payments). Replaces the
 * hand-copied `SummaryCard` each portal dashboard used to keep, so portal KPIs render exactly
 * like the internal ERP's. Without `onClick` it is just a plain `StatCard`. */
export function PortalStatCard({ onClick, ...props }: ComponentProps<typeof StatCard> & { onClick?: () => void }) {
  if (!onClick) return <StatCard {...props} />
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div]:h-full [&>div]:transition-colors hover:[&>div]:border-primary/40"
    >
      <StatCard {...props} />
    </button>
  )
}
