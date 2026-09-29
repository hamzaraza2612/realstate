import { Bell, CalendarClock, FileSignature, Wallet, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { money } from '@/modules/reports/format'
import { LeaseStatus, LeaseStatusLabel, MaintenanceStatus, RentScheduleStatus } from '@/types/api'
import { PortalStatCard } from '../shared/PortalStatCard'
import { useTenantLeases, useTenantMaintenanceRequests, useTenantRentSchedule, useUnreadNotificationCount } from './api'

export function TenantDashboardPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: leases, isLoading, isError, refetch } = useTenantLeases(1, 100)
  const activeLease = (leases?.items ?? []).find((l) => l.status === LeaseStatus.Active) ?? leases?.items[0]
  const { data: schedule } = useTenantRentSchedule(activeLease?.id)
  const { data: maintenance } = useTenantMaintenanceRequests(1, 100)
  const { data: unreadCount } = useUnreadNotificationCount()

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError) return <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />

  const unpaid = (schedule ?? []).filter((s) => s.status !== RentScheduleStatus.Paid && s.status !== RentScheduleStatus.Cancelled)
  const outstandingRent = unpaid.reduce((sum, s) => sum + Math.max(0, s.amount - s.paidAmount), 0)
  const hasOverdue = unpaid.some((s) => s.isOverdue || s.status === RentScheduleStatus.Overdue)
  const nextDue = [...unpaid].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
  const openRequests = (maintenance?.items ?? []).filter(
    (r) => r.status !== MaintenanceStatus.Resolved && r.status !== MaintenanceStatus.Cancelled,
  ).length
  const activeLeaseCount = (leases?.items ?? []).filter((l) => l.status === LeaseStatus.Active).length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's a summary of your lease.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PortalStatCard
          icon={FileSignature}
          label="Active leases"
          value={activeLeaseCount}
          onClick={() => navigate('/portal/tenant/leases')}
        />
        <PortalStatCard
          icon={Wallet}
          label="Outstanding rent"
          value={money(outstandingRent)}
          alert={hasOverdue}
          description={hasOverdue ? t('portal.tenant.includesOverdue') : undefined}
          onClick={activeLease ? () => navigate(`/portal/tenant/leases/${activeLease.id}`) : undefined}
        />
        <PortalStatCard
          icon={CalendarClock}
          label={t('portal.tenant.nextRentDue')}
          value={nextDue ? money(Math.max(0, nextDue.amount - nextDue.paidAmount)) : '—'}
          alert={!!nextDue && (nextDue.isOverdue || nextDue.status === RentScheduleStatus.Overdue)}
          description={
            nextDue
              ? t(nextDue.isOverdue || nextDue.status === RentScheduleStatus.Overdue ? 'portal.tenant.overdueSince' : 'portal.tenant.dueOn').replace(
                  '{date}',
                  formatDate(nextDue.dueDate),
                )
              : t('portal.tenant.nothingDue')
          }
          onClick={activeLease ? () => navigate(`/portal/tenant/leases/${activeLease.id}`) : undefined}
        />
        <PortalStatCard
          icon={Wrench}
          label={t('portal.tenant.openMaintenance')}
          value={openRequests}
          onClick={() => navigate('/portal/tenant/maintenance')}
        />
        <PortalStatCard
          icon={Bell}
          label="Unread notifications"
          value={unreadCount ?? 0}
          onClick={() => navigate('/portal/tenant/notifications')}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current lease</CardTitle>
        </CardHeader>
        <CardContent>
          {!activeLease ? (
            <EmptyState title={t('portal.tenant.noLeaseTitle')} description={t('portal.tenant.noLeaseDescription')} />
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/portal/tenant/leases/${activeLease.id}`)}
              className="flex w-full items-center justify-between gap-3 text-left text-sm hover:text-primary"
            >
              <div className="min-w-0">
                <p className="font-medium">{activeLease.leaseNumber}</p>
                <p className="text-muted-foreground">
                  {activeLease.propertyName} · Unit {activeLease.unitNumber}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(activeLease.startDate)} – {formatDate(activeLease.endDate)}
                </p>
              </div>
              <StatusBadge status={activeLease.status} labels={LeaseStatusLabel} />
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
