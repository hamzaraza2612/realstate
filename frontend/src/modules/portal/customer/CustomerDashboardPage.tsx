import { Bell, FileText, HandCoins, Receipt, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useI18n } from '@/lib/i18n'
import { money } from '@/modules/reports/format'
import { BookingStatus, BookingStatusLabel } from '@/types/api'
import { PortalStatCard } from '../shared/PortalStatCard'
import { useCustomerBookings, useCustomerPayments, useDocuments, useUnreadNotificationCount } from './api'

export function CustomerDashboardPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: bookings, isLoading, isError, refetch } = useCustomerBookings(1, 100)
  const { data: payments } = useCustomerPayments()
  const { data: documents } = useDocuments()
  const { data: unreadCount } = useUnreadNotificationCount()

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError) return <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />

  const activeBookings = (bookings?.items ?? []).filter((b) => b.status === BookingStatus.Confirmed)
  const paidByBooking = new Map<string, number>()
  for (const entry of payments ?? []) {
    paidByBooking.set(entry.bookingId, (paidByBooking.get(entry.bookingId) ?? 0) + entry.payment.amount)
  }
  const outstandingBalance = activeBookings.reduce((sum, b) => sum + Math.max(0, b.netPrice - (paidByBooking.get(b.id) ?? 0)), 0)
  const totalPaid = (payments ?? []).reduce((sum, entry) => sum + entry.payment.amount, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's a summary of your account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PortalStatCard
          icon={Receipt}
          label="Active bookings"
          value={activeBookings.length}
          onClick={() => navigate('/portal/customer/bookings')}
        />
        <PortalStatCard
          icon={Wallet}
          label="Outstanding balance"
          value={money(outstandingBalance)}
          alert={outstandingBalance > 0}
          onClick={() => navigate('/portal/customer/payments')}
        />
        <PortalStatCard
          icon={HandCoins}
          label={t('portal.totalPaid')}
          value={money(totalPaid)}
          description={t('portal.customer.paymentsCount').replace('{count}', String((payments ?? []).length))}
          onClick={() => navigate('/portal/customer/payments')}
        />
        <PortalStatCard
          icon={FileText}
          label={t('portal.documents')}
          value={(documents ?? []).length}
          onClick={() => navigate('/portal/customer/documents')}
        />
        <PortalStatCard
          icon={Bell}
          label="Unread notifications"
          value={unreadCount ?? 0}
          onClick={() => navigate('/portal/customer/notifications')}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {(bookings?.items.length ?? 0) === 0 ? (
            <EmptyState title="You have no bookings yet" description={t('portal.customer.noBookingsDescription')} />
          ) : (
            <div className="flex flex-col divide-y">
              {bookings!.items.slice(0, 5).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => navigate(`/portal/customer/bookings/${b.id}`)}
                  className="flex items-center justify-between gap-3 py-3 text-left text-sm hover:text-primary"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{b.bookingNumber}</p>
                    <p className="truncate text-muted-foreground">
                      {b.projectName} · {b.inventoryUnitCode}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium">{money(b.netPrice)}</span>
                    <StatusBadge status={b.status} labels={BookingStatusLabel} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
