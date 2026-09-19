import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { JournalEntryStatus, JournalEntryStatusLabel } from '@/types/api'
import { useJournalEntries } from './api'
import { JournalEntryFormDialog } from './JournalEntryFormDialog'

const statusVariant: Record<JournalEntryStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [JournalEntryStatus.Draft]: 'secondary',
  [JournalEntryStatus.Posted]: 'success',
  [JournalEntryStatus.Cancelled]: 'destructive',
}

const ALL = 'all'

export function JournalPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useJournalEntries(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as JournalEntryStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Double-entry postings across all modules."
        actions={
          <PermissionGate permission="finance.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New entry
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entry number…"
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
            {Object.entries(JournalEntryStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading journal entries…" />}
      {isError && <ErrorState message="Could not load journal entries." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No journal entries found" description="Try different filters or create a manual entry." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer" onClick={() => navigate(`/finance/journal/${entry.id}`)}>
                  <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(entry.entryDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.description ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.referenceType}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[entry.status]}>{JournalEntryStatusLabel[entry.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">${entry.totalDebit.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} entries
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

      <JournalEntryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
