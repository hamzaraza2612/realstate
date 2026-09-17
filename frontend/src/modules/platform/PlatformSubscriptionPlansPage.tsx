import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import type { SubscriptionPlanDto } from '@/types/api'
import { usePlatformSubscriptionPlans } from './api'
import { SubscriptionPlanFormDialog } from './SubscriptionPlanFormDialog'

export function PlatformSubscriptionPlansPage() {
  const { data: plans, isLoading, isError, refetch } = usePlatformSubscriptionPlans()
  const [editing, setEditing] = useState<SubscriptionPlanDto | 'new' | null>(null)

  return (
    <div>
      <PageHeader
        title="Subscription Plans"
        description="Plans sold to organizations. Feature codes gate which modules a tenant can use."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> New plan
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading plans…" />}
      {isError && <ErrorState message="Could not load plans." onRetry={() => refetch()} />}
      {!isLoading && !isError && plans?.length === 0 && (
        <EmptyState title="No plans yet" description="Create your first subscription plan." />
      )}

      {!isLoading && !isError && plans && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'success' : 'outline'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <CardDescription>${plan.price.toFixed(2)} / month</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{plan.userLimit} users · {plan.projectLimit} projects · {plan.storageLimitMb} MB storage</p>
                {plan.features.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {plan.features.map((f) => (
                      <Badge key={f} variant="secondary">
                        {f}
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
          ))}
        </div>
      )}

      <SubscriptionPlanFormDialog plan={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </div>
  )
}
