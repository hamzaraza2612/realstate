import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import {
  BookingStatusLabel,
  InstallmentStatusLabel,
  PaymentMethodLabel,
} from '@/types/api'
import { useCustomerBooking, useCustomerBookingPayments, useCustomerPaymentPlan } from './api'

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
            <StatusBadge status={booking.status} labels={BookingStatusLabel} />
          </Field>
          <Field label="Booking date">{formatDate(booking.bookingDate)}</Field>
          <Field label="Total price">{moneyExact(booking.totalPrice)}</Field>
          <Field label="Discount">{moneyExact(booking.discount)}</Field>
          <Field label="Net price">{moneyExact(booking.netPrice)}</Field>
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
                    <TableCell className="text-right">{moneyExact(i.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{moneyExact(i.paidAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} labels={InstallmentStatusLabel} />
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
                    <TableCell className="text-right">{moneyExact(p.amount)}</TableCell>
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
