import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { CoworkingBookingStatusLabel } from '@/types/api'
import { useMemberBooking } from './api'

export function MemberBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError, refetch } = useMemberBooking(id)

  if (isLoading) return <LoadingState label="Loading booking…" />
  if (isError || !booking) return <ErrorState message="Could not load this booking." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={booking.resourceLabel} description="Booking details" />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Status">
            <StatusBadge status={booking.status} labels={CoworkingBookingStatusLabel} />
          </Field>
          <Field label="Start">{formatDate(booking.startAt)}</Field>
          <Field label="End">{formatDate(booking.endAt)}</Field>
          <Field label="Price">{moneyExact(booking.price)}</Field>
          <Field label="Paid">{moneyExact(booking.paidAmount)}</Field>
          {booking.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notes</p>
              <p>{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
