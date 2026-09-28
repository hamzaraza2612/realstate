import { AlertTriangle, Building2, Clock, CreditCard, Landmark, ReceiptText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatCard } from '@/modules/reports/components/StatCard'
import { formatDate } from '@/lib/utils'
import { InvoiceStatus, SubscriptionStatus, SubscriptionStatusLabel, TenantStatus, TenantStatusLabel, type SubscriptionDto } from '@/types/api'
import { usePlatformInvoices, usePlatformOrganizations, usePlatformSubscriptions } from './api'

const subscriptionStatusVariant: Record<SubscriptionStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  0: 'secondary',
  1: 'success',
  2: 'warning',
  3: 'outline',
  4: 'destructive',
  5: 'destructive',
}

const tenantStatusVariant: Record<TenantStatus, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  [TenantStatus.Trial]: 'secondary',
  [TenantStatus.Active]: 'success',
  [TenantStatus.Suspended]: 'destructive',
  [TenantStatus.Cancelled]: 'outline',
}

export function PlatformSaaSDashboardPage() {
  const navigate = useNavigate()
  // No dedicated dashboard endpoint exists — this aggregates client-side from the same list
  // endpoints the Organizations/Subscriptions/Invoices pages already call, per the milestone's own
  // scope note. A large pageSize keeps the tenant-status breakdown accurate for realistic tenant
  // counts without a dedicated aggregation endpoint.
  const { data: orgs, isLoading: orgsLoading, isError: orgsError, refetch: refetchOrgs } = usePlatformOrganizations(1, '', 500)
  const { data: subscriptions, isLoading: subsLoading, isError: subsError, refetch: refetchSubs } = usePlatformSubscriptions()
  const { data: overdueInvoices, isLoading: invLoading, isError: invError, refetch: refetchInv } = usePlatformInvoices(1, { status: InvoiceStatus.Overdue }, 1)

  const isLoading = orgsLoading || subsLoading || invLoading
  const isError = orgsError || subsError || invError

  if (isLoading) return <LoadingState label="Loading SaaS dashboard…" />
  if (isError || !orgs || !subscriptions) {
    return (
      <ErrorState
        message="Could not load the SaaS dashboard."
        onRetry={() => {
          void refetchOrgs()
          void refetchSubs()
          void refetchInv()
        }}
      />
    )
  }

  const tenantsByStatus = orgs.items.reduce<Record<number, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const subscriptionsByStatus = subscriptions.reduce<Record<number, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  const expiringTrials: SubscriptionDto[] = subscriptions
    .filter((s) => s.status === SubscriptionStatus.Trialing && s.trialEndsAt)
    .sort((a, b) => new Date(a.trialEndsAt!).getTime() - new Date(b.trialEndsAt!).getTime())
    .slice(0, 8)

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === SubscriptionStatus.Active || s.status === SubscriptionStatus.Trialing || s.status === SubscriptionStatus.PastDue,
  ).length

  return (
    <div>
      <PageHeader title="SaaS Dashboard" description="Cross-tenant view of subscriptions, plans, and billing health." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Total tenants" value={orgs.meta?.total ?? orgs.items.length} />
        <StatCard
          icon={CreditCard}
          label="Subscriptions (non-terminal)"
          value={activeSubscriptions}
          description={`${subscriptions.length} total, including history`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue invoices"
          value={overdueInvoices?.meta?.total ?? 0}
          alert={(overdueInvoices?.meta?.total ?? 0) > 0}
        />
        <StatCard icon={Clock} label="Trials expiring soon" value={expiringTrials.length} description="Soonest 8 shown below" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenants by status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.values(TenantStatus).map((status) => (
              <Badge key={status} variant={tenantStatusVariant[status]}>
                {TenantStatusLabel[status]}: {tenantsByStatus[status] ?? 0}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.values(SubscriptionStatus).map((status) => (
              <Badge key={status} variant={subscriptionStatusVariant[status]}>
                {SubscriptionStatusLabel[status]}: {subscriptionsByStatus[status] ?? 0}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Trials expiring soonest</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {expiringTrials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants currently in trial.</p>
          ) : (
            <div className="divide-y">
              {expiringTrials.map((s) => (
                <div
                  key={s.id}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-2 py-2 text-sm hover:text-primary"
                  onClick={() => navigate(`/platform/organizations/${s.tenantId}`)}
                >
                  <span className="font-medium">{s.tenantName}</span>
                  <span className="text-muted-foreground">{s.planName}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <ReceiptText className="h-3.5 w-3.5" /> Trial ends {formatDate(s.trialEndsAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
