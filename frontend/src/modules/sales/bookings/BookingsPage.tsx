import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { BookingStatus, BookingStatusLabel } from '@/types/api'
import { useBookings } from './api'
import { BookingFormDialog } from './BookingFormDialog'

const ALL = 'all'

export function BookingsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useBookings(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as BookingStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="Sales bookings linking customers to inventory units."
        actions={
          <PermissionGate permission="sales.booking.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New booking
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search booking number…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(BookingStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading bookings…" />}
      {isError && <ErrorState message="Could not load bookings." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          title="No bookings found"
          description="Try different filters or create your first booking."
          action={
            <PermissionGate permission="sales.booking.create">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New booking
              </Button>
            </PermissionGate>
          }
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project / Unit</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Net price</TableHead>
                <TableHead>Booking date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${booking.id}`)}>
                  <TableCell className="font-medium">{booking.bookingNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{booking.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {booking.projectName} · {booking.inventoryUnitCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{booking.salesAgentUserName ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} labels={BookingStatusLabel} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">${booking.netPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(booking.bookingDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="bookings" onPageChange={setPage} />
        </>
      )}

      <BookingFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
