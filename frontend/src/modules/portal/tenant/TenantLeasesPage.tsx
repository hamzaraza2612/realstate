import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { LeaseStatusLabel } from '@/types/api'
import { useTenantLeases } from './api'

export function TenantLeasesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useTenantLeases(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Your Leases" description="Every lease you hold with us, past and present." />

      {isLoading && <LoadingState label="Loading leases…" />}
      {isError && <ErrorState message="Could not load your leases." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No leases yet" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease #</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Term</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((lease) => (
                <TableRow key={lease.id} className="cursor-pointer" onClick={() => navigate(`/portal/tenant/leases/${lease.id}`)}>
                  <TableCell className="font-medium">{lease.leaseNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {lease.propertyName} · {lease.unitNumber}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lease.status} labels={LeaseStatusLabel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{moneyExact(lease.rentAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="leases" onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
