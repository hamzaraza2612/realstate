import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { BookingStatus, BookingStatusLabel } from '@/types/api'
import { useCustomerBookings } from './api'

const statusVariant: Record<BookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [BookingStatus.Draft]: 'secondary',
  [BookingStatus.PendingApproval]: 'outline',
  [BookingStatus.Confirmed]: 'success',
  [BookingStatus.Cancelled]: 'destructive',
}

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
                    <Badge variant={statusVariant[booking.status]}>{BookingStatusLabel[booking.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">${booking.netPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(booking.bookingDate)}</TableCell>
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
