import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { InstallmentStatus, InstallmentStatusLabel } from '@/types/api'
import { useReceivables } from './api'

const statusVariant: Record<InstallmentStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InstallmentStatus.Pending]: 'outline',
  [InstallmentStatus.PartiallyPaid]: 'default',
  [InstallmentStatus.Paid]: 'success',
  [InstallmentStatus.Overdue]: 'destructive',
  [InstallmentStatus.Cancelled]: 'secondary',
}

const ALL = 'all'

export function ReceivablesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)

  const { data, isLoading, isError, refetch } = useReceivables(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as InstallmentStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1
  const totalOutstanding = (data?.items ?? []).reduce((sum, r) => sum + r.outstandingAmount, 0)

  return (
    <div>
      <PageHeader title="Receivables" description="Outstanding installments owed by customers, from the sales booking schedule." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer or booking…"
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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(InstallmentStatusLabel)
              .filter(([value]) => Number(value) !== InstallmentStatus.Cancelled)
              .map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          Page total outstanding: <strong className="text-foreground">${totalOutstanding.toLocaleString()}</strong>
        </span>
      </div>

      {isLoading && <LoadingState label="Loading receivables…" />}
      {isError && <ErrorState message="Could not load receivables." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No outstanding receivables" description="Every installment is either paid or not yet due." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Booking</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((r) => (
                <TableRow key={r.installmentId} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${r.bookingId}`)}>
                  <TableCell className="font-medium">{r.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.bookingNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{r.reference}</TableCell>
                  <TableCell className="text-muted-foreground">${r.amount.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">${r.outstandingAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{InstallmentStatusLabel[r.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} receivables
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
