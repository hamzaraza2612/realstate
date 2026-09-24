import { Bell, FileSignature, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { LeaseStatus, LeaseStatusLabel, RentScheduleStatus } from '@/types/api'
import { useTenantLeases, useTenantRentSchedule, useUnreadNotificationCount } from './api'

const statusVariant: Record<LeaseStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [LeaseStatus.Draft]: 'secondary',
  [LeaseStatus.PendingApproval]: 'outline',
  [LeaseStatus.Active]: 'success',
  [LeaseStatus.Expired]: 'secondary',
  [LeaseStatus.Terminated]: 'destructive',
  [LeaseStatus.Cancelled]: 'destructive',
}

export function TenantDashboardPage() {
  const navigate = useNavigate()
  const { data: leases, isLoading, isError, refetch } = useTenantLeases(1, 100)
  const activeLease = (leases?.items ?? []).find((l) => l.status === LeaseStatus.Active) ?? leases?.items[0]
  const { data: schedule } = useTenantRentSchedule(activeLease?.id)
  const { data: unreadCount } = useUnreadNotificationCount()

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError) return <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />

  const outstandingRent = (schedule ?? [])
    .filter((s) => s.status !== RentScheduleStatus.Paid && s.status !== RentScheduleStatus.Cancelled)
    .reduce((sum, s) => sum + Math.max(0, s.amount - s.paidAmount), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's a summary of your lease.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={FileSignature}
          label="Active leases"
          value={String((leases?.items ?? []).filter((l) => l.status === LeaseStatus.Active).length)}
          onClick={() => navigate('/portal/tenant/leases')}
        />
        <SummaryCard icon={Wallet} label="Outstanding rent" value={`$${outstandingRent.toLocaleString()}`} onClick={() => activeLease && navigate(`/portal/tenant/leases/${activeLease.id}`)} />
        <SummaryCard icon={Bell} label="Unread notifications" value={String(unreadCount ?? 0)} onClick={() => navigate('/portal/tenant/notifications')} />
      </div>

      {activeLease && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current lease</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => navigate(`/portal/tenant/leases/${activeLease.id}`)}
              className="flex w-full items-center justify-between gap-2 text-left text-sm hover:text-primary"
            >
              <div>
                <p className="font-medium">{activeLease.leaseNumber}</p>
                <p className="text-muted-foreground">
                  {activeLease.propertyName} · Unit {activeLease.unitNumber}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(activeLease.startDate)} – {formatDate(activeLease.endDate)}
                </p>
              </div>
              <Badge variant={statusVariant[activeLease.status]}>{LeaseStatusLabel[activeLease.status]}</Badge>
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-semibold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
