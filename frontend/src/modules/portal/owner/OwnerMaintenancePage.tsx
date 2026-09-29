import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { MaintenanceCategoryLabel, MaintenancePriorityLabel, MaintenanceStatusLabel } from '@/types/api'
import { useOwnerMaintenanceRequests } from './api'

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
                    <StatusBadge status={r.status} labels={MaintenanceStatusLabel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.reportedDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="requests" onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
