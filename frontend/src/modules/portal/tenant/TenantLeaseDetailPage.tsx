import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import {
  LeasePaymentFrequencyLabel,
  LeaseStatusLabel,
  PaymentMethodLabel,
  RentScheduleStatus,
  RentScheduleStatusLabel,
  SecurityDepositStatusLabel,
} from '@/types/api'
import { useTenantLease, useTenantLeasePayments, useTenantRentSchedule, useTenantSecurityDeposit } from './api'

export function TenantLeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: lease, isLoading, isError, refetch } = useTenantLease(id)
  const { data: schedule } = useTenantRentSchedule(id)
  const { data: payments } = useTenantLeasePayments(id)
  const { data: deposit, isError: depositIsError } = useTenantSecurityDeposit(id)

  if (isLoading) return <LoadingState label="Loading lease…" />
  if (isError || !lease) return <ErrorState message="Could not load this lease." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={lease.leaseNumber} description={`${lease.propertyName} · Unit ${lease.unitNumber}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lease details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <StatusBadge status={lease.status} labels={LeaseStatusLabel} />
            </Field>
            <Field label="Payment frequency">{LeasePaymentFrequencyLabel[lease.paymentFrequency]}</Field>
            <Field label="Start date">{formatDate(lease.startDate)}</Field>
            <Field label="End date">{formatDate(lease.endDate)}</Field>
            <Field label="Rent amount">{moneyExact(lease.rentAmount)}</Field>
            <Field label="Grace period">{lease.gracePeriodDays} days</Field>
            {lease.terms && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Terms</p>
                <p>{lease.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!depositIsError && deposit && (
          <Card>
            <CardHeader>
              <CardTitle>Security deposit</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Field label="Status">
                <StatusBadge status={deposit.status} labels={SecurityDepositStatusLabel} />
              </Field>
              <Field label="Amount">{moneyExact(deposit.amount)}</Field>
              <Field label="Refunded amount">{moneyExact(deposit.refundedAmount)}</Field>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rent schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {(schedule?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No rent schedule has been generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule!.map((s) => (
                  <TableRow key={s.id} className={s.isOverdue ? 'bg-destructive/5' : undefined}>
                    <TableCell>{s.periodNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.dueDate)}</TableCell>
                    <TableCell className="text-right">{moneyExact(s.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{moneyExact(s.paidAmount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={s.status} labels={RentScheduleStatusLabel} />
                        {s.isOverdue && s.status !== RentScheduleStatus.Overdue && <StatusBadge status="Overdue" />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {(payments?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                    <TableCell className="text-muted-foreground">#{p.rentSchedulePeriodNumber}</TableCell>
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
