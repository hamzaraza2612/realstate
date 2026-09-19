import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import type { InstallmentDto } from '@/types/api'
import { BookingStatus, BookingStatusLabel, InstallmentStatus, InstallmentStatusLabel, PaymentMethodLabel } from '@/types/api'
import { useApproveBooking, useBooking, useCancelBooking, usePayments, usePaymentPlan, useSubmitBooking } from './api'
import { PaymentPlanFormDialog } from './PaymentPlanFormDialog'
import { PaymentRecordDialog } from './PaymentRecordDialog'

const bookingStatusVariant: Record<BookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [BookingStatus.Draft]: 'secondary',
  [BookingStatus.PendingApproval]: 'outline',
  [BookingStatus.Confirmed]: 'success',
  [BookingStatus.Cancelled]: 'destructive',
}

const installmentStatusVariant: Record<InstallmentStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InstallmentStatus.Pending]: 'outline',
  [InstallmentStatus.PartiallyPaid]: 'default',
  [InstallmentStatus.Paid]: 'success',
  [InstallmentStatus.Overdue]: 'destructive',
  [InstallmentStatus.Cancelled]: 'secondary',
}

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError, refetch } = useBooking(id)
  const { data: plan, isLoading: planLoading, isError: planIsError } = usePaymentPlan(id)
  const { data: payments } = usePayments(id)

  const submitBooking = useSubmitBooking()
  const approveBooking = useApproveBooking()
  const cancelBooking = useCancelBooking()

  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [paymentDialogTarget, setPaymentDialogTarget] = useState<InstallmentDto | null>(null)

  async function handleAction(action: 'submit' | 'approve' | 'cancel') {
    if (!id) return
    try {
      const mutation = action === 'submit' ? submitBooking : action === 'approve' ? approveBooking : cancelBooking;
      await mutation.mutateAsync(id)
      toast({ title: `Booking ${action === 'submit' ? 'submitted for approval' : action === 'approve' ? 'approved' : 'cancelled'}`, variant: 'success' })
    } catch (error) {
      toast({ title: `Could not ${action} booking`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading booking…" />
  if (isError || !booking) return <ErrorState message="Could not load this booking." onRetry={() => refetch()} />

  const canSubmit = booking.status === BookingStatus.Draft
  const canApprove = booking.status === BookingStatus.PendingApproval
  const canCancel = booking.status === BookingStatus.Draft || booking.status === BookingStatus.PendingApproval || booking.status === BookingStatus.Confirmed

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        description={`${booking.customerName} · ${booking.projectName} · ${booking.inventoryUnitCode}`}
        actions={
          <div className="flex gap-2">
            {canSubmit && (
              <PermissionGate permission="sales.booking.create">
                <Button variant="outline" onClick={() => handleAction('submit')} disabled={submitBooking.isPending}>
                  Submit for approval
                </Button>
              </PermissionGate>
            )}
            {canApprove && (
              <PermissionGate permission="sales.booking.approve">
                <Button onClick={() => handleAction('approve')} disabled={approveBooking.isPending}>
                  Approve
                </Button>
              </PermissionGate>
            )}
            {canCancel && (
              <PermissionGate permission="sales.booking.cancel">
                <Button variant="destructive" onClick={() => handleAction('cancel')} disabled={cancelBooking.isPending}>
                  Cancel booking
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={bookingStatusVariant[booking.status]}>{BookingStatusLabel[booking.status]}</Badge>
            </Field>
            <Field label="Booking date">{formatDate(booking.bookingDate)}</Field>
            <Field label="Sales agent">{booking.salesAgentUserName ?? '—'}</Field>
            <Field label="Total price">${booking.totalPrice.toLocaleString()}</Field>
            <Field label="Discount">${booking.discount.toLocaleString()}</Field>
            <Field label="Net price">${booking.netPrice.toLocaleString()}</Field>
            {booking.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>Payments recorded against this booking.</CardDescription>
          </CardHeader>
          <CardContent>
            {(payments?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {payments!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b pb-1 last:border-0">
                    <span>
                      {p.receiptNumber} · {PaymentMethodLabel[p.method]}
                    </span>
                    <span className="font-medium">${p.amount.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Payment plan</CardTitle>
            <CardDescription>Installment schedule for this booking.</CardDescription>
          </div>
          {!plan && !planLoading && (
            <PermissionGate permission="sales.booking.create">
              <Button size="sm" onClick={() => setPlanDialogOpen(true)}>
                Configure payment plan
              </Button>
            </PermissionGate>
          )}
        </CardHeader>
        <CardContent>
          {planLoading && <LoadingState label="Loading payment plan…" />}
          {!planLoading && planIsError && <p className="text-sm text-muted-foreground">This booking has no payment plan yet.</p>}
          {!planLoading && plan && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>{installment.installmentNumber}</TableCell>
                    <TableCell className="font-medium">{installment.label}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(installment.dueDate)}</TableCell>
                    <TableCell>${installment.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">${installment.paidAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">${installment.remainingAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={installmentStatusVariant[installment.status]}>{InstallmentStatusLabel[installment.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {installment.remainingAmount > 0 && installment.status !== InstallmentStatus.Cancelled && (
                        <PermissionGate permission="sales.payment.record">
                          <Button size="sm" variant="outline" onClick={() => setPaymentDialogTarget(installment)}>
                            Record payment
                          </Button>
                        </PermissionGate>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {id && <PaymentPlanFormDialog open={planDialogOpen} onOpenChange={setPlanDialogOpen} bookingId={id} netPrice={booking.netPrice} />}
      {id && <PaymentRecordDialog open={!!paymentDialogTarget} onOpenChange={(o) => !o && setPaymentDialogTarget(null)} bookingId={id} installment={paymentDialogTarget} />}
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
