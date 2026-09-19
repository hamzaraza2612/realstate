import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { useTasks } from '@/modules/construction/tasks/api'
import { ConstructionTaskStatus, ConstructionTaskStatusLabel, WorkPackageStatus, WorkPackageStatusLabel } from '@/types/api'
import { useDeleteWorkPackage, useWorkPackage, useWorkPackageStatusAction } from './api'
import { WorkPackageFormDialog } from './WorkPackageFormDialog'

const statusVariant: Record<WorkPackageStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [WorkPackageStatus.Planned]: 'secondary',
  [WorkPackageStatus.InProgress]: 'default',
  [WorkPackageStatus.OnHold]: 'outline',
  [WorkPackageStatus.Completed]: 'success',
  [WorkPackageStatus.Cancelled]: 'destructive',
}

const taskStatusVariant: Record<ConstructionTaskStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [ConstructionTaskStatus.Planned]: 'secondary',
  [ConstructionTaskStatus.InProgress]: 'default',
  [ConstructionTaskStatus.Blocked]: 'destructive',
  [ConstructionTaskStatus.Completed]: 'success',
  [ConstructionTaskStatus.Cancelled]: 'outline',
}

const transitions: Record<WorkPackageStatus, { status: WorkPackageStatus; label: string; variant?: 'destructive' | 'outline' }[]> = {
  [WorkPackageStatus.Planned]: [
    { status: WorkPackageStatus.InProgress, label: 'Start' },
    { status: WorkPackageStatus.OnHold, label: 'Put on hold', variant: 'outline' },
    { status: WorkPackageStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [WorkPackageStatus.InProgress]: [
    { status: WorkPackageStatus.OnHold, label: 'Put on hold', variant: 'outline' },
    { status: WorkPackageStatus.Completed, label: 'Mark complete' },
    { status: WorkPackageStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [WorkPackageStatus.OnHold]: [
    { status: WorkPackageStatus.InProgress, label: 'Resume' },
    { status: WorkPackageStatus.Cancelled, label: 'Cancel', variant: 'destructive' },
  ],
  [WorkPackageStatus.Completed]: [],
  [WorkPackageStatus.Cancelled]: [],
}

export function WorkPackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: workPackage, isLoading, isError, refetch } = useWorkPackage(id)
  const { data: tasks } = useTasks(1, { workPackageId: id }, 50)
  const statusAction = useWorkPackageStatusAction()
  const deleteWorkPackage = useDeleteWorkPackage()
  const [editOpen, setEditOpen] = useState(false)

  async function handleStatus(status: WorkPackageStatus) {
    if (!id) return
    try {
      await statusAction.mutateAsync({ id, status })
      toast({ title: `Work package moved to ${WorkPackageStatusLabel[status]}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteWorkPackage.mutateAsync(id)
      toast({ title: 'Work package deleted', variant: 'success' })
      navigate('/construction/work-packages')
    } catch (error) {
      toast({ title: 'Could not delete work package', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading work package…" />
  if (isError || !workPackage) return <ErrorState message="Could not load this work package." onRetry={() => refetch()} />

  const availableTransitions = transitions[workPackage.status]

  return (
    <div>
      <PageHeader
        title={`${workPackage.code} · ${workPackage.name}`}
        description={workPackage.projectName}
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
              {(workPackage.status === WorkPackageStatus.Planned || workPackage.status === WorkPackageStatus.Cancelled) && (
                <Button variant="destructive" onClick={handleDelete} disabled={deleteWorkPackage.isPending}>
                  Delete
                </Button>
              )}
            </div>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Work package details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[workPackage.status]}>{WorkPackageStatusLabel[workPackage.status]}</Badge>
            </Field>
            <Field label="Progress">{workPackage.progressPercent}%</Field>
            <Field label="Manager">{workPackage.managerUserName ?? '—'}</Field>
            <Field label="Budget">{workPackage.budget != null ? `$${workPackage.budget.toLocaleString()}` : '—'}</Field>
            <Field label="Planned start">{workPackage.plannedStartDate ? formatDate(workPackage.plannedStartDate) : '—'}</Field>
            <Field label="Planned end">{workPackage.plannedEndDate ? formatDate(workPackage.plannedEndDate) : '—'}</Field>
            <Field label="Actual start">{workPackage.actualStartDate ? formatDate(workPackage.actualStartDate) : '—'}</Field>
            <Field label="Actual end">{workPackage.actualEndDate ? formatDate(workPackage.actualEndDate) : '—'}</Field>
            {workPackage.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p>{workPackage.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Tasks under this work package.</CardDescription>
          </CardHeader>
          <CardContent>
            {(tasks?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {tasks!.items.map((t) => (
                  <li key={t.id} className="flex cursor-pointer items-center justify-between border-b pb-1 last:border-0" onClick={() => navigate(`/construction/tasks/${t.id}`)}>
                    <span>{t.title}</span>
                    <Badge variant={taskStatusVariant[t.status]}>{ConstructionTaskStatusLabel[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <WorkPackageFormDialog open={editOpen} onOpenChange={setEditOpen} workPackage={workPackage} />
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
