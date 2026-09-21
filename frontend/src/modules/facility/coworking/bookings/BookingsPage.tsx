import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { CoworkingBookingStatus, CoworkingBookingStatusLabel } from '@/types/api'
import { useCoworkingBookings } from './api'
import { BookingFormDialog } from './BookingFormDialog'

const ALL = 'all'

const statusVariant: Record<CoworkingBookingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [CoworkingBookingStatus.Pending]: 'outline',
  [CoworkingBookingStatus.Confirmed]: 'default',
  [CoworkingBookingStatus.Completed]: 'success',
  [CoworkingBookingStatus.Cancelled]: 'destructive',
}

export function BookingsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useCoworkingBookings(page, {
    status: status === ALL ? undefined : (Number(status) as CoworkingBookingStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Desk and meeting room bookings made by coworking members."
        actions={
          <PermissionGate permission="facility.coworking.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New booking
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(CoworkingBookingStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading bookings…" />}
      {isError && <ErrorState message="Could not load bookings." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No bookings found" description="Create a booking for a desk or meeting room." />}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer" onClick={() => navigate(`/facility/coworking/bookings/${booking.id}`)}>
                  <TableCell className="font-medium">{booking.memberName}</TableCell>
                  <TableCell className="text-muted-foreground">{booking.resourceLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(booking.startAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(booking.endAt)}</TableCell>
                  <TableCell className="text-right">${booking.price.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">${booking.paidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[booking.status]}>{CoworkingBookingStatusLabel[booking.status]}</Badge>
                  </TableCell>
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

      <BookingFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
