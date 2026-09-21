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
import { FacilityPaymentSourceType, MembershipStatus, MembershipStatusLabel } from '@/types/api'
import { useMembership, useUpdateMembershipStatus } from './api'

const statusVariant: Record<MembershipStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MembershipStatus.Active]: 'success',
  [MembershipStatus.Expired]: 'secondary',
  [MembershipStatus.Cancelled]: 'destructive',
}

export function MembershipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: membership, isLoading, isError, refetch } = useMembership(id)
  const updateStatus = useUpdateMembershipStatus()
  const [paymentOpen, setPaymentOpen] = useState(false)

  async function handleStatus(status: MembershipStatus) {
    if (!membership) return
    try {
      await updateStatus.mutateAsync({ id: membership.id, status })
      toast({ title: `Membership moved to ${MembershipStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update membership', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading membership…" />
  if (isError || !membership) return <ErrorState message="Could not load this membership." onRetry={() => refetch()} />

  const outstanding = membership.amount - membership.paidAmount

  return (
    <div>
      <PageHeader
        title={`${membership.memberName} · ${membership.planName}`}
        description={`${formatDate(membership.startDate)} – ${formatDate(membership.endDate)}`}
        actions={
          membership.status === MembershipStatus.Active && (
            <PermissionGate permission="facility.coworking.manage">
              <Button variant="destructive" onClick={() => handleStatus(MembershipStatus.Cancelled)} disabled={updateStatus.isPending}>
                Cancel membership
              </Button>
            </PermissionGate>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Membership details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[membership.status]}>{MembershipStatusLabel[membership.status]}</Badge>
            </Field>
            <Field label="Amount">${membership.amount.toLocaleString()}</Field>
            <Field label="Paid amount">${membership.paidAmount.toLocaleString()}</Field>
            <Field label="Outstanding">${outstanding.toLocaleString()}</Field>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <PaymentHistoryCard
          sourceType={FacilityPaymentSourceType.CoworkingMembership}
          sourceId={membership.id}
          canRecord={membership.status === MembershipStatus.Active && outstanding > 0}
          onRecordPayment={() => setPaymentOpen(true)}
        />
      </div>

      <RecordFacilityPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        sourceType={FacilityPaymentSourceType.CoworkingMembership}
        sourceId={membership.id}
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
