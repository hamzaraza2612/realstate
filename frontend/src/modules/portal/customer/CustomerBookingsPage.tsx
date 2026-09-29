import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { BookingStatusLabel } from '@/types/api'
import { useCustomerBookings } from './api'

export function CustomerBookingsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useCustomerBookings(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Your Bookings" description="Every unit you've booked with us." />

      {isLoading && <LoadingState label="Loading bookings…" />}
      {isError && <ErrorState message="Could not load your bookings." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No bookings yet" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Project / Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Net price</TableHead>
                <TableHead>Booking date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer" onClick={() => navigate(`/portal/customer/bookings/${booking.id}`)}>
                  <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {booking.projectName} · {booking.inventoryUnitCode}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} labels={BookingStatusLabel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{moneyExact(booking.netPrice)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(booking.bookingDate)}</TableCell>
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
