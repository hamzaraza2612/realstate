import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { PaymentMethodLabel } from '@/types/api'
import { useCustomerPayments } from './api'

export function CustomerPaymentsPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCustomerPayments()

  return (
    <div>
      <PageHeader title="Payment History" description="Every payment you've made across all of your bookings." />

      {isLoading && <LoadingState label="Loading payments…" />}
      {isError && <ErrorState message="Could not load your payment history." onRetry={() => refetch()} />}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No payments yet" />}
      {!isLoading && !isError && data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Installment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow
                key={entry.payment.id}
                className="cursor-pointer"
                onClick={() => navigate(`/portal/customer/bookings/${entry.bookingId}`)}
              >
                <TableCell className="font-medium">{entry.payment.receiptNumber}</TableCell>
                <TableCell className="text-muted-foreground">{entry.bookingNumber}</TableCell>
                <TableCell className="text-muted-foreground">{entry.payment.installmentLabel}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(entry.payment.paymentDate)}</TableCell>
                <TableCell className="text-muted-foreground">{PaymentMethodLabel[entry.payment.method]}</TableCell>
                <TableCell className="text-right">${entry.payment.amount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
