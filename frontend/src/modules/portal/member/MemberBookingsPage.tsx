import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { CoworkingBookingStatusLabel } from '@/types/api'
import { useMemberBookings } from './api'

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
                    <StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{moneyExact(b.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="bookings" onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
