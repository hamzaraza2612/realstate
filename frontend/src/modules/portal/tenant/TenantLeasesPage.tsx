import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { LeaseStatus, LeaseStatusLabel } from '@/types/api'
import { useTenantLeases } from './api'

const statusVariant: Record<LeaseStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [LeaseStatus.Draft]: 'secondary',
  [LeaseStatus.PendingApproval]: 'outline',
  [LeaseStatus.Active]: 'success',
  [LeaseStatus.Expired]: 'secondary',
  [LeaseStatus.Terminated]: 'destructive',
  [LeaseStatus.Cancelled]: 'destructive',
}

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
                    <Badge variant={statusVariant[lease.status]}>{LeaseStatusLabel[lease.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">${lease.rentAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} leases
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
