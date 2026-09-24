import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import {
  BookingStatus,
  BookingStatusLabel,
  InstallmentStatus,
  InstallmentStatusLabel,
  PaymentMethodLabel,
} from '@/types/api'
import { useCustomerBooking, useCustomerBookingPayments, useCustomerPaymentPlan } from './api'

const statusVariant: Record<BookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
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

export function CustomerBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError, refetch } = useCustomerBooking(id)
  const { data: plan, isError: planIsError } = useCustomerPaymentPlan(id)
  const { data: payments } = useCustomerBookingPayments(id)

  if (isLoading) return <LoadingState label="Loading booking…" />
  if (isError || !booking) return <ErrorState message="Could not load this booking." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={booking.bookingNumber} description={`${booking.projectName} · ${booking.inventoryUnitCode}`} />

      <Card>
        <CardHeader>
          <CardTitle>Booking details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Status">
            <Badge variant={statusVariant[booking.status]}>{BookingStatusLabel[booking.status]}</Badge>
          </Field>
          <Field label="Booking date">{formatDate(booking.bookingDate)}</Field>
          <Field label="Total price">${booking.totalPrice.toLocaleString()}</Field>
          <Field label="Discount">${booking.discount.toLocaleString()}</Field>
          <Field label="Net price">${booking.netPrice.toLocaleString()}</Field>
          {booking.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notes</p>
              <p>{booking.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!planIsError && plan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment plan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.installments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.installmentNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{i.label}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right">${i.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${i.paidAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={installmentStatusVariant[i.status]}>{InstallmentStatusLabel[i.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {(payments?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet for this booking.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{p.installmentLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{PaymentMethodLabel[p.method]}</TableCell>
                    <TableCell className="text-right">${p.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
