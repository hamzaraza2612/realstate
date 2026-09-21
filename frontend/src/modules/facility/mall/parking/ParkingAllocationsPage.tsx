import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { RecordFacilityPaymentDialog } from '@/modules/facility/payments/RecordFacilityPaymentDialog'
import { FacilityPaymentSourceType, ParkingAllocationStatus, ParkingAllocationStatusLabel, type ParkingAllocationDto } from '@/types/api'
import { useEndParkingAllocation, useParkingAllocations } from './api'

const ALL = 'all'

const statusVariant: Record<ParkingAllocationStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ParkingAllocationStatus.Active]: 'success',
  [ParkingAllocationStatus.Ended]: 'secondary',
}

export function ParkingAllocationsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [paymentTarget, setPaymentTarget] = useState<ParkingAllocationDto | undefined>()

  const { data, isLoading, isError, refetch } = useParkingAllocations(page, {
    status: status === ALL ? undefined : (Number(status) as ParkingAllocationStatus),
  })
  const endAllocation = useEndParkingAllocation()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleEnd(id: string) {
    try {
      await endAllocation.mutateAsync(id)
      toast({ title: 'Allocation ended', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not end allocation', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader title="Parking Allocations" description="Active and past parking allocations." />

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
            {Object.entries(ParkingAllocationStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading parking allocations…" />}
      {isError && <ErrorState message="Could not load parking allocations." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No parking allocations found" description="Allocate a parking space from the Parking Spaces page." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium">{allocation.parkingSpaceCode}</TableCell>
                  <TableCell className="text-muted-foreground">{allocation.rentalTenantName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{allocation.vehicleReference ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(allocation.startDate)}</TableCell>
                  <TableCell className="text-right">${allocation.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${allocation.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[allocation.status]}>{ParkingAllocationStatusLabel[allocation.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {allocation.paidAmount < allocation.amount && (
                        <PermissionGate permission="facility.payment.record">
                          <Button size="sm" variant="outline" onClick={() => setPaymentTarget(allocation)}>
                            Record payment
                          </Button>
                        </PermissionGate>
                      )}
                      {allocation.status === ParkingAllocationStatus.Active && (
                        <PermissionGate permission="facility.mall.manage">
                          <Button size="sm" variant="destructive" onClick={() => handleEnd(allocation.id)} disabled={endAllocation.isPending}>
                            End
                          </Button>
                        </PermissionGate>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} allocations
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

      <RecordFacilityPaymentDialog
        open={!!paymentTarget}
        onOpenChange={(o) => !o && setPaymentTarget(undefined)}
        sourceType={FacilityPaymentSourceType.Parking}
        sourceId={paymentTarget?.id}
        outstandingAmount={paymentTarget ? paymentTarget.amount - paymentTarget.paidAmount : undefined}
      />
    </div>
  )
}
