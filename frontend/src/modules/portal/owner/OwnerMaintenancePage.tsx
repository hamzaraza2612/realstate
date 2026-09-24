import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { MaintenanceCategoryLabel, MaintenancePriorityLabel, MaintenanceStatus, MaintenanceStatusLabel } from '@/types/api'
import { useOwnerMaintenanceRequests } from './api'

const statusVariant: Record<MaintenanceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenanceStatus.Open]: 'outline',
  [MaintenanceStatus.Assigned]: 'default',
  [MaintenanceStatus.InProgress]: 'default',
  [MaintenanceStatus.OnHold]: 'secondary',
  [MaintenanceStatus.Resolved]: 'success',
  [MaintenanceStatus.Cancelled]: 'destructive',
}

export function OwnerMaintenancePage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useOwnerMaintenanceRequests(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Maintenance" description="Open and past maintenance requests across your properties." />

      {isLoading && <LoadingState label="Loading requests…" />}
      {isError && <ErrorState message="Could not load maintenance requests." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No maintenance requests" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requestNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.propertyName}
                    {r.unitNumber ? ` · ${r.unitNumber}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{MaintenanceCategoryLabel[r.category]}</TableCell>
                  <TableCell className="text-muted-foreground">{MaintenancePriorityLabel[r.priority]}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{MaintenanceStatusLabel[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.reportedDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} requests
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
    </div>
  )
}
