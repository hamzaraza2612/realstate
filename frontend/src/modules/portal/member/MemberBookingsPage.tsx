import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { CoworkingBookingStatus, CoworkingBookingStatusLabel } from '@/types/api'
import { useMemberBookings } from './api'

const statusVariant: Record<CoworkingBookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [CoworkingBookingStatus.Pending]: 'outline',
  [CoworkingBookingStatus.Confirmed]: 'success',
  [CoworkingBookingStatus.Completed]: 'secondary',
  [CoworkingBookingStatus.Cancelled]: 'destructive',
}

export function MemberBookingsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useMemberBookings(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Your Bookings" description="Desk and meeting room bookings." />

      {isLoading && <LoadingState label="Loading bookings…" />}
      {isError && <ErrorState message="Could not load your bookings." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No bookings yet" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/portal/member/bookings/${b.id}`)}>
                  <TableCell className="font-medium">{b.resourceLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(b.startAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(b.endAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[b.status]}>{CoworkingBookingStatusLabel[b.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">${b.price.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} bookings
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
