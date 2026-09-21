import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { RecordFacilityPaymentDialog } from '@/modules/facility/payments/RecordFacilityPaymentDialog'
import { FacilityPaymentSourceType, ServiceChargeStatus, ServiceChargeStatusLabel, type ServiceChargeChargeDto } from '@/types/api'
import { useServiceCharges } from './api'
import { GenerateChargeDialog } from './GenerateChargeDialog'

const ALL = 'all'

const statusVariant: Record<ServiceChargeStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ServiceChargeStatus.Pending]: 'outline',
  [ServiceChargeStatus.PartiallyPaid]: 'default',
  [ServiceChargeStatus.Paid]: 'success',
  [ServiceChargeStatus.Cancelled]: 'destructive',
}

export function ServiceChargesPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<ServiceChargeChargeDto | undefined>()

  const { data, isLoading, isError, refetch } = useServiceCharges(page, {
    status: status === ALL ? undefined : (Number(status) as ServiceChargeStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Service Charges"
        description="Generated service charges billed against mall shop leases."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4" /> Generate charge
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(ServiceChargeStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading service charges…" />}
      {isError && <ErrorState message="Could not load service charges." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No service charges found" description="Generate a charge against a definition and lease." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Definition</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell className="font-medium">{charge.serviceChargeDefinitionName}</TableCell>
                  <TableCell className="text-muted-foreground">{charge.leaseNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(charge.periodStart)} – {formatDate(charge.periodEnd)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(charge.dueDate)}</TableCell>
                  <TableCell className="text-right">${charge.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${charge.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[charge.status]}>{ServiceChargeStatusLabel[charge.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {charge.status !== ServiceChargeStatus.Paid && charge.status !== ServiceChargeStatus.Cancelled && (
                      <PermissionGate permission="facility.payment.record">
                        <Button size="sm" variant="outline" onClick={() => setPaymentTarget(charge)}>
                          Record payment
                        </Button>
                      </PermissionGate>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} charges
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <GenerateChargeDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <RecordFacilityPaymentDialog
        open={!!paymentTarget}
        onOpenChange={(o) => !o && setPaymentTarget(undefined)}
        sourceType={FacilityPaymentSourceType.ServiceCharge}
        sourceId={paymentTarget?.id}
        outstandingAmount={paymentTarget ? paymentTarget.amount - paymentTarget.paidAmount : undefined}
      />
    </div>
  )
}
