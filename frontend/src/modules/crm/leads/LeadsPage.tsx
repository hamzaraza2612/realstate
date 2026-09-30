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
import { LeadPriority, LeadPriorityLabel, LeadSourceLabel, LeadStatus, LeadStatusLabel } from '@/types/api'
import { useLeads } from './api'
import { LeadFormDialog } from './LeadFormDialog'

const ALL = 'all'

export function LeadsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [priority, setPriority] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useLeads(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as LeadStatus),
    priority: priority === ALL ? undefined : (Number(priority) as LeadPriority),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Prospects moving through your sales pipeline."
        actions={
          <PermissionGate permission="crm.lead.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add lead
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone…"
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
            {Object.entries(LeadStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {Object.entries(LeadPriorityLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading leads…" />}
      {isError && <ErrorState message="Could not load leads." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          title="No leads found"
          description="Try different filters or add your first lead."
          action={
            <PermissionGate permission="crm.lead.create">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add lead
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
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                  <TableCell className="font-medium">
                    {lead.fullName}
                    {lead.companyName && <span className="ml-1.5 text-sm text-muted-foreground">· {lead.companyName}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{LeadSourceLabel[lead.source]}</TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} labels={LeadStatusLabel} />
                  </TableCell>
                  <TableCell>{LeadPriorityLabel[lead.priority]}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.assignedToUserName ?? 'Unassigned'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="leads" onPageChange={setPage} />
        </>
      )}

      <LeadFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
