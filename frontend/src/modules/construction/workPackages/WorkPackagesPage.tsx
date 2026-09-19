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
import { WorkPackageStatus, WorkPackageStatusLabel } from '@/types/api'
import { useWorkPackages } from './api'
import { WorkPackageFormDialog } from './WorkPackageFormDialog'

const statusVariant: Record<WorkPackageStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [WorkPackageStatus.Planned]: 'secondary',
  [WorkPackageStatus.InProgress]: 'default',
  [WorkPackageStatus.OnHold]: 'outline',
  [WorkPackageStatus.Completed]: 'success',
  [WorkPackageStatus.Cancelled]: 'destructive',
}

const ALL = 'all'

export function WorkPackagesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useWorkPackages(page, {
    search: search || undefined,
    status: status === ALL ? undefined : (Number(status) as WorkPackageStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Work Packages"
        description="Construction work packages grouping tasks under a project."
        actions={
          <PermissionGate permission="construction.project.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New work package
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or code…"
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
            {Object.entries(WorkPackageStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading work packages…" />}
      {isError && <ErrorState message="Could not load work packages." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No work packages found" description="Try different filters or create your first work package." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Planned start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((wp) => (
                <TableRow key={wp.id} className="cursor-pointer" onClick={() => navigate(`/construction/work-packages/${wp.id}`)}>
                  <TableCell className="font-medium">{wp.code}</TableCell>
                  <TableCell>{wp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{wp.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{wp.managerUserName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[wp.status]}>{WorkPackageStatusLabel[wp.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{wp.progressPercent}%</TableCell>
                  <TableCell className="text-muted-foreground">{wp.budget != null ? `$${wp.budget.toLocaleString()}` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{wp.plannedStartDate ? formatDate(wp.plannedStartDate) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} work packages
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

      <WorkPackageFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
