import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import {
  LeasePaymentFrequencyLabel,
  LeaseStatus,
  LeaseStatusLabel,
  PaymentMethodLabel,
  RentScheduleStatus,
  RentScheduleStatusLabel,
  SecurityDepositStatus,
  SecurityDepositStatusLabel,
} from '@/types/api'
import { useTenantLease, useTenantLeasePayments, useTenantRentSchedule, useTenantSecurityDeposit } from './api'

const statusVariant: Record<LeaseStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [LeaseStatus.Draft]: 'secondary',
  [LeaseStatus.PendingApproval]: 'outline',
  [LeaseStatus.Active]: 'success',
  [LeaseStatus.Expired]: 'secondary',
  [LeaseStatus.Terminated]: 'destructive',
  [LeaseStatus.Cancelled]: 'destructive',
}

const scheduleStatusVariant: Record<RentScheduleStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [RentScheduleStatus.Pending]: 'outline',
  [RentScheduleStatus.PartiallyPaid]: 'default',
  [RentScheduleStatus.Paid]: 'success',
  [RentScheduleStatus.Overdue]: 'destructive',
  [RentScheduleStatus.Cancelled]: 'secondary',
}

const depositStatusVariant: Record<SecurityDepositStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [SecurityDepositStatus.Pending]: 'outline',
  [SecurityDepositStatus.Held]: 'default',
  [SecurityDepositStatus.PartiallyRefunded]: 'secondary',
  [SecurityDepositStatus.Refunded]: 'success',
  [SecurityDepositStatus.Forfeited]: 'destructive',
}

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
              <Badge variant={statusVariant[lease.status]}>{LeaseStatusLabel[lease.status]}</Badge>
            </Field>
            <Field label="Payment frequency">{LeasePaymentFrequencyLabel[lease.paymentFrequency]}</Field>
            <Field label="Start date">{formatDate(lease.startDate)}</Field>
            <Field label="End date">{formatDate(lease.endDate)}</Field>
            <Field label="Rent amount">${lease.rentAmount.toLocaleString()}</Field>
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
                <Badge variant={depositStatusVariant[deposit.status]}>{SecurityDepositStatusLabel[deposit.status]}</Badge>
              </Field>
              <Field label="Amount">${deposit.amount.toLocaleString()}</Field>
              <Field label="Refunded amount">${deposit.refundedAmount.toLocaleString()}</Field>
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
                    <TableCell className="text-right">${s.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${s.paidAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={scheduleStatusVariant[s.status]}>{RentScheduleStatusLabel[s.status]}</Badge>
                        {s.isOverdue && <Badge variant="destructive">Overdue</Badge>}
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
