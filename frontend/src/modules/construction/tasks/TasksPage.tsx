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
import { ConstructionTaskPriority, ConstructionTaskPriorityLabel, ConstructionTaskStatus, ConstructionTaskStatusLabel } from '@/types/api'
import { useTasks } from './api'
import { TaskFormDialog } from './TaskFormDialog'

const ALL = 'all'

const statusVariant: Record<ConstructionTaskStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ConstructionTaskStatus.Planned]: 'secondary',
  [ConstructionTaskStatus.InProgress]: 'default',
  [ConstructionTaskStatus.Blocked]: 'destructive',
  [ConstructionTaskStatus.Completed]: 'success',
  [ConstructionTaskStatus.Cancelled]: 'outline',
}

const priorityVariant: Record<ConstructionTaskPriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ConstructionTaskPriority.Low]: 'outline',
  [ConstructionTaskPriority.Medium]: 'secondary',
  [ConstructionTaskPriority.High]: 'destructive',
}

export function TasksPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useTasks(page, {
    status: status === ALL ? undefined : (Number(status) as ConstructionTaskStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Construction Tasks"
        description="Tasks tracked under work packages, with dependencies and delay tracking."
        actions={
          <PermissionGate permission="construction.project.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New task
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(ConstructionTaskStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading tasks…" />}
      {isError && <ErrorState message="Could not load tasks." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No tasks found" description="Try different filters or create your first task." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Work package</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Planned end</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => navigate(`/construction/tasks/${t.id}`)}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="text-muted-foreground">{t.workPackageName}</TableCell>
                  <TableCell className="text-muted-foreground">{t.assignedToUserName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[t.priority]}>{ConstructionTaskPriorityLabel[t.priority]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[t.status]}>{ConstructionTaskStatusLabel[t.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.progressPercent}%</TableCell>
                  <TableCell className="text-muted-foreground">{t.plannedEndDate ? formatDate(t.plannedEndDate) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} tasks
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

      <TaskFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
