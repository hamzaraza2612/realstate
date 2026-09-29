import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { MaintenanceCategoryLabel, MaintenancePriorityLabel, MaintenanceStatusLabel } from '@/types/api'
import { useVendorAssignedWork } from './api'

export function VendorAssignedWorkPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useVendorAssignedWork(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Assigned Work" description="Maintenance requests assigned to you." />

      {isLoading && <LoadingState label="Loading assigned work…" />}
      {isError && <ErrorState message="Could not load assigned work." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No work assigned to you" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Location</TableHead>
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
                    {r.propertyName || r.facilityName}
                    {r.unitNumber ? ` · ${r.unitNumber}` : r.spaceCode ? ` · ${r.spaceCode}` : ''}
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
