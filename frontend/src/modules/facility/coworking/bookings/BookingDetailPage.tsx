import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { PaymentHistoryCard } from '@/modules/facility/payments/PaymentHistoryCard'
import { RecordFacilityPaymentDialog } from '@/modules/facility/payments/RecordFacilityPaymentDialog'
import { CoworkingBookingStatus, CoworkingBookingStatusLabel, FacilityPaymentSourceType } from '@/types/api'
import { useCoworkingBooking, useUpdateCoworkingBookingStatus } from './api'

const statusVariant: Record<CoworkingBookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [CoworkingBookingStatus.Pending]: 'outline',
  [CoworkingBookingStatus.Confirmed]: 'default',
  [CoworkingBookingStatus.Completed]: 'success',
  [CoworkingBookingStatus.Cancelled]: 'destructive',
}

const transitions: Partial<Record<CoworkingBookingStatus, { status: CoworkingBookingStatus; label: string; variant?: 'destructive' | 'outline' }[]>> = {
  [CoworkingBookingStatus.Pending]: [
    { status: CoworkingBookingStatus.Confirmed, label: 'Confirm' },
    { status: CoworkingBookingStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [CoworkingBookingStatus.Confirmed]: [
    { status: CoworkingBookingStatus.Completed, label: 'Mark completed' },
    { status: CoworkingBookingStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError, refetch } = useCoworkingBooking(id)
  const updateStatus = useUpdateCoworkingBookingStatus()
  const [paymentOpen, setPaymentOpen] = useState(false)

  async function handleStatus(status: CoworkingBookingStatus) {
    if (!booking) return
    try {
      await updateStatus.mutateAsync({ id: booking.id, status })
      toast({ title: `Booking moved to ${CoworkingBookingStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update booking', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading booking…" />
  if (isError || !booking) return <ErrorState message="Could not load this booking." onRetry={() => refetch()} />

  const outstanding = booking.price - booking.paidAmount
  const availableTransitions = transitions[booking.status] ?? []

  return (
    <div>
      <PageHeader
        title={`${booking.memberName} · ${booking.resourceLabel}`}
        description={`${formatDate(booking.startAt)} – ${formatDate(booking.endAt)}`}
        actions={
          availableTransitions.length > 0 && (
            <PermissionGate permission="facility.coworking.manage">
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((t) => (
                  <Button key={t.status} variant={t.variant} onClick={() => handleStatus(t.status)} disabled={updateStatus.isPending}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </PermissionGate>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[booking.status]}>{CoworkingBookingStatusLabel[booking.status]}</Badge>
            </Field>
            <Field label="Price">${booking.price.toLocaleString()}</Field>
            <Field label="Paid amount">${booking.paidAmount.toLocaleString()}</Field>
            <Field label="Outstanding">${outstanding.toLocaleString()}</Field>
            {booking.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <PaymentHistoryCard
          sourceType={FacilityPaymentSourceType.CoworkingBooking}
          sourceId={booking.id}
          canRecord={booking.status !== CoworkingBookingStatus.Cancelled && outstanding > 0}
          onRecordPayment={() => setPaymentOpen(true)}
        />
      </div>

      <RecordFacilityPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        sourceType={FacilityPaymentSourceType.CoworkingBooking}
        sourceId={booking.id}
        outstandingAmount={outstanding}
      />
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
