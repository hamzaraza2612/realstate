import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { FiscalPeriodStatus, FiscalPeriodStatusLabel } from '@/types/api'
import { useCloseFiscalPeriod, useFiscalPeriods, useReopenFiscalPeriod } from './api'
import { FiscalPeriodFormDialog } from './FiscalPeriodFormDialog'

export function FiscalPeriodsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; action: 'close' | 'reopen' } | null>(null)

  const { data: periods, isLoading, isError, refetch } = useFiscalPeriods()
  const closePeriod = useCloseFiscalPeriod()
  const reopenPeriod = useReopenFiscalPeriod()

  async function handleConfirm() {
    if (!confirmTarget) return
    try {
      if (confirmTarget.action === 'close') {
        await closePeriod.mutateAsync(confirmTarget.id)
        toast({ title: 'Fiscal period closed', variant: 'success' })
      } else {
        await reopenPeriod.mutateAsync(confirmTarget.id)
        toast({ title: 'Fiscal period reopened', variant: 'success' })
      }
      setConfirmTarget(null)
    } catch (error) {
      toast({
        title: confirmTarget.action === 'close' ? 'Could not close period' : 'Could not reopen period',
        description: extractErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  return (
    <div>
      <PageHeader
        title="Fiscal Periods"
        description="Accounting periods that control which dates can receive new postings."
        actions={
          <PermissionGate permission="finance.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New period
            </Button>
          </PermissionGate>
        }
      />

      {isLoading && <LoadingState label="Loading fiscal periods…" />}
      {isError && <ErrorState message="Could not load fiscal periods." onRetry={() => refetch()} />}
      {!isLoading && !isError && periods?.length === 0 && (
        <EmptyState title="No fiscal periods yet" description="Create your first fiscal period to start controlling postings." />
      )}

      {!isLoading && !isError && periods && periods.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed by / at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">{period.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(period.startDate)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(period.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={period.status === FiscalPeriodStatus.Closed ? 'destructive' : 'success'}>
                    {FiscalPeriodStatusLabel[period.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {period.closedByUserName ? `${period.closedByUserName} · ${formatDate(period.closedAt)}` : '—'}
                </TableCell>
                <TableCell>
                  <PermissionGate permission="finance.manage">
                    {period.status === FiscalPeriodStatus.Open ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmTarget({ id: period.id, name: period.name, action: 'close' })}
                      >
                        Close
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmTarget({ id: period.id, name: period.name, action: 'reopen' })}
                      >
                        Reopen
                      </Button>
                    )}
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <FiscalPeriodFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={confirmTarget?.action === 'close' ? 'Close fiscal period' : 'Reopen fiscal period'}
        description={
          confirmTarget?.action === 'close'
            ? `Closing "${confirmTarget?.name}" will block all future backdated postings into this period. This is an accounting control action.`
            : `Reopening "${confirmTarget?.name}" will allow backdated postings into this period again.`
        }
        confirmLabel={confirmTarget?.action === 'close' ? 'Close period' : 'Reopen period'}
        destructive={confirmTarget?.action === 'close'}
        onConfirm={handleConfirm}
        loading={closePeriod.isPending || reopenPeriod.isPending}
      />
    </div>
  )
}
