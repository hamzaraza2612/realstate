import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { PaymentMethodLabel, RentScheduleStatus, RentScheduleStatusLabel, SecurityDepositStatus, SecurityDepositStatusLabel, LeasePaymentFrequencyLabel, LeaseStatus, LeaseStatusLabel, type RentScheduleDto } from '@/types/api'
import {
  useApproveLease,
  useCancelLease,
  useExpireLease,
  useLease,
  useRentPayments,
  useRentSchedule,
  useSecurityDeposit,
  useSubmitLease,
  useTerminateLease,
} from './api'
import { LeaseFormDialog } from './LeaseFormDialog'
import { RentPaymentDialog } from './RentPaymentDialog'
import { SecurityDepositActionDialog, type SecurityDepositAction } from './SecurityDepositActionDialog'

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

export function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: lease, isLoading, isError, refetch } = useLease(id)
  const { data: schedule } = useRentSchedule(id)
  const { data: payments } = useRentPayments(id)
  const { data: deposit, isError: depositIsError } = useSecurityDeposit(id)

  const submitLease = useSubmitLease()
  const approveLease = useApproveLease()
  const expireLease = useExpireLease()
  const terminateLease = useTerminateLease()
  const cancelLease = useCancelLease()

  const [editOpen, setEditOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<RentScheduleDto | null>(null)
  const [depositAction, setDepositAction] = useState<SecurityDepositAction | null>(null)

  async function handleAction(action: () => Promise<unknown>, successTitle: string, failTitle: string) {
    try {
      await action()
      toast({ title: successTitle, variant: 'success' })
    } catch (error) {
      toast({ title: failTitle, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading lease…" />
  if (isError || !lease) return <ErrorState message="Could not load this lease." onRetry={() => refetch()} />

  const isDraft = lease.status === LeaseStatus.Draft
  const isPendingApproval = lease.status === LeaseStatus.PendingApproval
  const isActive = lease.status === LeaseStatus.Active
  const canCancel = isDraft || isPendingApproval

  return (
    <div>
      <PageHeader
        title={lease.leaseNumber}
        description={`${lease.propertyName} · ${lease.unitNumber} · ${lease.rentalTenantName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <PermissionGate permission="property.lease.manage">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button
                  onClick={() => handleAction(() => submitLease.mutateAsync(lease.id), 'Lease submitted for approval', 'Could not submit lease')}
                  disabled={submitLease.isPending}
                >
                  Submit for approval
                </Button>
              </PermissionGate>
            )}
            {isPendingApproval && (
              <PermissionGate permission="property.lease.approve">
                <Button
                  onClick={() => handleAction(() => approveLease.mutateAsync(lease.id), 'Lease approved and activated', 'Could not approve lease')}
                  disabled={approveLease.isPending}
                >
                  Approve
                </Button>
              </PermissionGate>
            )}
            {isActive && (
              <PermissionGate permission="property.lease.manage">
                <Button
                  variant="outline"
                  onClick={() => handleAction(() => expireLease.mutateAsync(lease.id), 'Lease expired', 'Could not expire lease')}
                  disabled={expireLease.isPending}
                >
                  Expire
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction(() => terminateLease.mutateAsync(lease.id), 'Lease terminated', 'Could not terminate lease')}
                  disabled={terminateLease.isPending}
                >
                  Terminate
                </Button>
              </PermissionGate>
            )}
            {canCancel && (
              <PermissionGate permission="property.lease.manage">
                <Button
                  variant="destructive"
                  onClick={() => handleAction(() => cancelLease.mutateAsync(lease.id), 'Lease cancelled', 'Could not cancel lease')}
                  disabled={cancelLease.isPending}
                >
                  Cancel
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

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
            <Field label="Security deposit">{lease.securityDeposit != null ? `$${lease.securityDeposit.toLocaleString()}` : '—'}</Field>
            <Field label="Grace period">{lease.gracePeriodDays} days</Field>
            {lease.terms && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Terms</p>
                <p>{lease.terms}</p>
              </div>
            )}
            {lease.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{lease.notes}</p>
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
              <Field label="Received date">{deposit.receivedDate ? formatDate(deposit.receivedDate) : '—'}</Field>
              <Field label="Refunded amount">${deposit.refundedAmount.toLocaleString()}</Field>
              <PermissionGate permission="property.lease.manage">
                <div className="flex flex-wrap gap-2 pt-1">
                  {deposit.status === SecurityDepositStatus.Pending && (
                    <Button size="sm" onClick={() => setDepositAction('receive')}>
                      Receive
                    </Button>
                  )}
                  {(deposit.status === SecurityDepositStatus.Held || deposit.status === SecurityDepositStatus.PartiallyRefunded) && (
                    <>
                      <Button size="sm" onClick={() => setDepositAction('refund')}>
                        Refund
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDepositAction('forfeit')}>
                        Forfeit
                      </Button>
                    </>
                  )}
                </div>
              </PermissionGate>
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
            <p className="text-sm text-muted-foreground">No rent schedule has been generated yet. Approving the lease generates it.</p>
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
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule!.map((s) => (
                  <TableRow key={s.id}>
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
                    <TableCell>
                      {s.status !== RentScheduleStatus.Paid && s.status !== RentScheduleStatus.Cancelled && (
                        <PermissionGate permission="property.payment.record">
                          <Button size="sm" variant="outline" onClick={() => setPaymentTarget(s)}>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
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
                  <TableHead>Recorded by</TableHead>
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
                    <TableCell className="text-muted-foreground">{p.recordedByUserName ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeaseFormDialog open={editOpen} onOpenChange={setEditOpen} lease={lease} />
      {id && <RentPaymentDialog open={!!paymentTarget} onOpenChange={(o) => !o && setPaymentTarget(null)} leaseId={id} schedule={paymentTarget} />}
      <SecurityDepositActionDialog
        open={!!depositAction}
        onOpenChange={(o) => !o && setDepositAction(null)}
        leaseId={id}
        deposit={deposit}
        action={depositAction}
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
