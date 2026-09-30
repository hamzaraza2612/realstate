import { Bell, CalendarClock, CreditCard, FileText } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { money } from '@/modules/reports/format'
import { CoworkingBookingStatus, CoworkingBookingStatusLabel, MembershipStatusLabel } from '@/types/api'
import { PortalStatCard } from '../shared/PortalStatCard'
import { useActiveMembership, useDocuments, useMemberBookings, useUnreadNotificationCount } from './api'

export function MemberDashboardPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: membership, isLoading, isError } = useActiveMembership()
  const { data: bookings } = useMemberBookings(1, 100)
  const { data: documents } = useDocuments()
  const { data: unreadCount } = useUnreadNotificationCount()
  // Captured once per mount so "upcoming" is stable across re-renders (e.g. the notification poll).
  const [now] = useState(() => Date.now())

  if (isLoading) return <LoadingState label="Loading your dashboard…" />

  const upcoming = (bookings?.items ?? [])
    .filter(
      (b) =>
        new Date(b.endAt).getTime() >= now &&
        (b.status === CoworkingBookingStatus.Pending || b.status === CoworkingBookingStatus.Confirmed),
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const hasMembership = !isError && !!membership
  const balanceDue = hasMembership ? Math.max(0, membership.amount - membership.paidAmount) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your membership at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard
          icon={CreditCard}
          label={t('portal.member.membership')}
          value={hasMembership ? membership.planName : '—'}
          description={hasMembership ? t('portal.member.until').replace('{date}', formatDate(membership.endDate)) : t('portal.member.noMembership')}
        />
        <PortalStatCard
          icon={CalendarClock}
          label={t('portal.member.upcomingBookings')}
          value={upcoming.length}
          description={t('portal.member.totalBookings').replace('{count}', String(bookings?.meta?.total ?? 0))}
          onClick={() => navigate('/portal/member/bookings')}
        />
        <PortalStatCard
          icon={FileText}
          label={t('portal.documents')}
          value={(documents ?? []).length}
          onClick={() => navigate('/portal/member/documents')}
        />
        <PortalStatCard
          icon={Bell}
          label="Unread notifications"
          value={unreadCount ?? 0}
          onClick={() => navigate('/portal/member/notifications')}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active membership</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasMembership ? (
              <EmptyState title="No active membership" description="You don't have an active membership right now." />
            ) : (
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold">{membership.planName}</p>
                  <StatusBadge status={membership.status} labels={MembershipStatusLabel} />
                </div>
                <p className="text-muted-foreground">
                  {formatDate(membership.startDate)} – {formatDate(membership.endDate)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{money(membership.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">{money(membership.paidAmount)}</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('portal.member.balanceDue')}</span>
                    <span className="font-medium text-destructive">{money(balanceDue)}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('portal.member.upcomingBookings')}</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState title={t('portal.member.noUpcomingTitle')} description={t('portal.member.noUpcomingDescription')} />
            ) : (
              <div className="flex flex-col divide-y">
                {upcoming.slice(0, 5).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => navigate(`/portal/member/bookings/${b.id}`)}
                    className="flex items-center justify-between gap-3 py-3 text-left text-sm hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.resourceLabel}</p>
                      <p className="text-muted-foreground">{formatDate(b.startAt)}</p>
                    </div>
                    <StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
