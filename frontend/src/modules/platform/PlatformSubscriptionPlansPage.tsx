import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatCurrency } from '@/lib/utils'
import { BillingCycleLabel, EntitlementType, type SubscriptionPlanDto } from '@/types/api'
import { entitlementLabel } from '@/lib/entitlementCatalog'
import { usePlatformSubscriptionPlans } from './api'
import { SubscriptionPlanFormDialog } from './SubscriptionPlanFormDialog'

export function PlatformSubscriptionPlansPage() {
  const { data: plans, isLoading, isError, refetch } = usePlatformSubscriptionPlans()
  const [editing, setEditing] = useState<SubscriptionPlanDto | 'new' | null>(null)

  const sortedPlans = [...(plans ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        description="Plans sold to organizations. Entitlements gate which modules and limits a tenant gets."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading plans…" />}
      {isError && <ErrorState message="Could not load plans." onRetry={() => refetch()} />}
      {!isLoading && !isError && sortedPlans.length === 0 && (
        <EmptyState title="No plans yet" description="Create your first subscription plan." />
      )}

      {!isLoading && !isError && sortedPlans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const features = plan.entitlements.filter((e) => e.type === EntitlementType.Feature && e.boolValue !== false)
            const limits = plan.entitlements.filter((e) => e.type === EntitlementType.Limit)
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant={plan.isActive ? 'success' : 'outline'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <CardDescription>
                    {formatCurrency(plan.price, plan.currency)} / {BillingCycleLabel[plan.billingCycle].toLowerCase()}
                    {plan.setupPrice ? ` · ${formatCurrency(plan.setupPrice, plan.currency)} setup` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-mono text-xs">{plan.code}</p>
                  {plan.description && <p>{plan.description}</p>}
                  <p>{plan.trialDays > 0 ? `${plan.trialDays}-day trial` : 'No trial'}</p>

                  {limits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {limits.map((l) => (
                        <Badge key={l.code} variant="outline">
                          {entitlementLabel(l.code)}: {l.numericValue == null ? 'Unlimited' : l.numericValue}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {features.map((f) => (
                        <Badge key={f.code} variant="secondary">
                          {entitlementLabel(f.code)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <SubscriptionPlanFormDialog plan={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </div>
  )
}
