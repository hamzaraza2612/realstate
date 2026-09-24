import type { ReactNode } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Same icon + big value + label + description visual pattern as
 * `modules/finance/dashboard/FinanceDashboardPage.tsx`'s `StatCard`, reused across every
 * report page's KPI grid. `description` accepts a node so a card can carry a second or
 * third related figure instead of sprawling into its own tile. */
export function StatCard({
  icon: Icon,
  label,
  value,
  description,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: ReactNode
  description?: ReactNode
  alert?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className={alert ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-primary'} />
        </div>
        <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        <CardDescription>{label}</CardDescription>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </CardHeader>
    </Card>
  )
}
