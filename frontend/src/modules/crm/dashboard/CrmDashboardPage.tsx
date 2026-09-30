import { AlertTriangle, Percent, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { LeadStatus, LeadStatusLabel } from '@/types/api'
import { useCrmDashboard } from './api'

export function CrmDashboardPage() {
  const { data, isLoading, isError, refetch } = useCrmDashboard()

  if (isLoading) return <LoadingState label="Loading CRM dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the CRM dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="CRM Dashboard" description="Pipeline health and follow-up activity across your organization." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total leads" value={data.totalLeads} description={`${data.newLeadsLast30Days} new in last 30 days`} />
        <StatCard icon={UserPlus} label="Unassigned leads" value={data.unassignedLeads} description={`${data.assignedLeads} assigned`} />
        <StatCard
          icon={AlertTriangle}
          label="Pending follow-ups"
          value={data.pendingFollowUps}
          description={`${data.overdueFollowUps} overdue`}
          alert={data.overdueFollowUps > 0}
        />
        <StatCard icon={Percent} label="Conversion rate" value={`${data.conversionRatePercent}%`} description={`${data.totalCustomers} total customers`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Leads by stage</CardTitle>
          <CardDescription>Where prospects currently sit in the pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(data.leadsByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* Backend groups by the C# enum's ToString() (e.g. "ProposalSent"), which matches
                  these object keys — not the numeric value used elsewhere in the API. */}
              {Object.entries(LeadStatus).map(([name, value]) => {
                const count = data.leadsByStatus[name] ?? 0
                return (
                  <Badge key={name} variant="secondary" className="text-sm">
                    {LeadStatusLabel[value]}: {count}
                  </Badge>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
