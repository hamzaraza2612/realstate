import { Bell, Receipt, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { BookingStatus } from '@/types/api'
import { useCustomerBookings, useCustomerPayments, useUnreadNotificationCount } from './api'

export function CustomerDashboardPage() {
  const navigate = useNavigate()
  const { data: bookings, isLoading, isError, refetch } = useCustomerBookings(1, 100)
  const { data: payments } = useCustomerPayments()
  const { data: unreadCount } = useUnreadNotificationCount()

  if (isLoading) return <LoadingState label="Loading your dashboard…" />
  if (isError) return <ErrorState message="Could not load your dashboard." onRetry={() => refetch()} />

  const activeBookings = (bookings?.items ?? []).filter((b) => b.status === BookingStatus.Confirmed)
  const paidByBooking = new Map<string, number>()
  for (const entry of payments ?? []) {
    paidByBooking.set(entry.bookingId, (paidByBooking.get(entry.bookingId) ?? 0) + entry.payment.amount)
  }
  const outstandingBalance = activeBookings.reduce((sum, b) => sum + Math.max(0, b.netPrice - (paidByBooking.get(b.id) ?? 0)), 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's a summary of your account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Receipt} label="Active bookings" value={String(activeBookings.length)} onClick={() => navigate('/portal/customer/bookings')} />
        <SummaryCard
          icon={Wallet}
          label="Outstanding balance"
          value={`$${outstandingBalance.toLocaleString()}`}
          onClick={() => navigate('/portal/customer/payments')}
        />
        <SummaryCard
          icon={Bell}
          label="Unread notifications"
          value={String(unreadCount ?? 0)}
          onClick={() => navigate('/portal/customer/notifications')}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {(bookings?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">You have no bookings yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {bookings!.items.slice(0, 5).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => navigate(`/portal/customer/bookings/${b.id}`)}
                  className="flex items-center justify-between gap-2 py-3 text-left text-sm hover:text-primary"
                >
                  <div>
                    <p className="font-medium">{b.bookingNumber}</p>
                    <p className="text-muted-foreground">
                      {b.projectName} · {b.inventoryUnitCode}
                    </p>
                  </div>
                  <span className="font-medium">${b.netPrice.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
