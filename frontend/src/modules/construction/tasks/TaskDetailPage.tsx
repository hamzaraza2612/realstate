import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { ConstructionTaskPriority, ConstructionTaskPriorityLabel, ConstructionTaskStatus, ConstructionTaskStatusLabel } from '@/types/api'
import { useDeleteTask, useTask, useTaskStatusAction } from './api'
import { TaskFormDialog } from './TaskFormDialog'

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

const transitions: Record<ConstructionTaskStatus, { status: ConstructionTaskStatus; label: string; variant?: 'destructive' | 'outline' }[]> = {
  [ConstructionTaskStatus.Planned]: [
    { status: ConstructionTaskStatus.InProgress, label: 'Start' },
    { status: ConstructionTaskStatus.Blocked, label: 'Block', variant: 'outline' },
    { status: ConstructionTaskStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [ConstructionTaskStatus.InProgress]: [
    { status: ConstructionTaskStatus.Blocked, label: 'Block', variant: 'outline' },
    { status: ConstructionTaskStatus.Completed, label: 'Mark complete' },
    { status: ConstructionTaskStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [ConstructionTaskStatus.Blocked]: [
    { status: ConstructionTaskStatus.InProgress, label: 'Resume' },
    { status: ConstructionTaskStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [ConstructionTaskStatus.Completed]: [],
  [ConstructionTaskStatus.Cancelled]: [],
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: task, isLoading, isError, refetch } = useTask(id)
  const statusAction = useTaskStatusAction()
  const deleteTask = useDeleteTask()
  const [editOpen, setEditOpen] = useState(false)

  async function handleStatus(status: ConstructionTaskStatus) {
    if (!id) return
    try {
      await statusAction.mutateAsync({ id, status })
      toast({ title: `Task moved to ${ConstructionTaskStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteTask.mutateAsync(id)
      toast({ title: 'Task deleted', variant: 'success' })
      navigate('/construction/tasks')
    } catch (error) {
      toast({ title: 'Could not delete task', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading task…" />
  if (isError || !task) return <ErrorState message="Could not load this task." onRetry={() => refetch()} />

  const availableTransitions = transitions[task.status]

  return (
    <div>
      <PageHeader
        title={task.title}
        description={task.workPackageName}
        actions={
          <PermissionGate permission="construction.project.manage">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              {availableTransitions.map((t) => (
                <Button key={t.status} variant={t.variant} onClick={() => handleStatus(t.status)} disabled={statusAction.isPending}>
                  {t.label}
                </Button>
              ))}
              {(task.status === ConstructionTaskStatus.Planned || task.status === ConstructionTaskStatus.Cancelled) && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
                  Delete
                </Button>
              )}
            </div>
          </PermissionGate>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Task details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Status">
            <Badge variant={statusVariant[task.status]}>{ConstructionTaskStatusLabel[task.status]}</Badge>
          </Field>
          <Field label="Priority">
            <Badge variant={priorityVariant[task.priority]}>{ConstructionTaskPriorityLabel[task.priority]}</Badge>
          </Field>
          <Field label="Progress">{task.progressPercent}%</Field>
          <Field label="Assignee">{task.assignedToUserName ?? '—'}</Field>
          <Field label="Planned start">{task.plannedStartDate ? formatDate(task.plannedStartDate) : '—'}</Field>
          <Field label="Planned end">{task.plannedEndDate ? formatDate(task.plannedEndDate) : '—'}</Field>
          <Field label="Actual start">{task.actualStartDate ? formatDate(task.actualStartDate) : '—'}</Field>
          <Field label="Actual end">{task.actualEndDate ? formatDate(task.actualEndDate) : '—'}</Field>
          <Field label="Depends on">{task.dependsOnTaskTitle ?? '—'}</Field>
          {task.description && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p>{task.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
