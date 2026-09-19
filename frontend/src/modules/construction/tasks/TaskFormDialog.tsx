import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllWorkPackages } from '@/modules/construction/workPackages/api'
import { useUsers } from '@/modules/users/api'
import { ConstructionTaskPriority, ConstructionTaskPriorityLabel, type ConstructionTaskDto } from '@/types/api'
import { useCreateTask, useTasks, useUpdateTask } from './api'

const NONE = 'none'

const schema = z.object({
  workPackageId: z.string().min(1, 'Work package is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedToUserId: z.string().optional(),
  priority: z.string().min(1, 'Required'),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  dependsOnTaskId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultWorkPackageId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: ConstructionTaskDto
  defaultWorkPackageId?: string
}) {
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const navigate = useNavigate()

  const { data: workPackages } = useAllWorkPackages()
  const { data: users } = useUsers(1, '')

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const workPackageId = watch('workPackageId')
  const { data: siblingTasks } = useTasks(1, { workPackageId: workPackageId || undefined }, 100)

  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              workPackageId: task.workPackageId,
              title: task.title,
              description: task.description ?? '',
              assignedToUserId: task.assignedToUserId ?? NONE,
              priority: String(task.priority),
              plannedStartDate: task.plannedStartDate ?? '',
              plannedEndDate: task.plannedEndDate ?? '',
              dependsOnTaskId: task.dependsOnTaskId ?? NONE,
            }
          : {
              workPackageId: defaultWorkPackageId ?? '',
              title: '',
              description: '',
              assignedToUserId: NONE,
              priority: String(ConstructionTaskPriority.Medium),
              plannedStartDate: '',
              plannedEndDate: '',
              dependsOnTaskId: NONE,
            },
      )
    }
  }, [open, task, defaultWorkPackageId, reset])

  async function onSubmit(values: FormValues) {
    const priority = Number(values.priority) as ConstructionTaskPriority
    try {
      if (task) {
        await updateTask.mutateAsync({
          id: task.id,
          payload: {
            title: values.title,
            description: values.description || null,
            assignedToUserId: values.assignedToUserId && values.assignedToUserId !== NONE ? values.assignedToUserId : null,
            priority,
            plannedStartDate: values.plannedStartDate || null,
            plannedEndDate: values.plannedEndDate || null,
            actualStartDate: task.actualStartDate,
            actualEndDate: task.actualEndDate,
            progressPercent: task.progressPercent,
          },
        })
        toast({ title: 'Task updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createTask.mutateAsync({
          workPackageId: values.workPackageId,
          title: values.title,
          description: values.description || null,
          assignedToUserId: values.assignedToUserId && values.assignedToUserId !== NONE ? values.assignedToUserId : null,
          priority,
          plannedStartDate: values.plannedStartDate || null,
          plannedEndDate: values.plannedEndDate || null,
          dependsOnTaskId: values.dependsOnTaskId && values.dependsOnTaskId !== NONE ? values.dependsOnTaskId : null,
        })
        toast({ title: 'Task created', variant: 'success' })
        onOpenChange(false)
        navigate(`/construction/tasks/${created.id}`)
      }
    } catch (error) {
      toast({ title: `Could not ${task ? 'update' : 'create'} task`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createTask.isPending || updateTask.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>Tasks under a work package.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Work package</Label>
            <Controller
              control={control}
              name="workPackageId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!task}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a work package" />
                  </SelectTrigger>
                  <SelectContent>
                    {(workPackages ?? []).map((wp) => (
                      <SelectItem key={wp.id} value={wp.id}>
                        {wp.code} · {wp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.workPackageId && <p className="text-xs text-destructive">{errors.workPackageId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ConstructionTaskPriorityLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assignee (optional)</Label>
              <Controller
                control={control}
                name="assignedToUserId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {(users?.items ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedStartDate">Planned start</Label>
              <Input id="plannedStartDate" type="date" {...register('plannedStartDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedEndDate">Planned end</Label>
              <Input id="plannedEndDate" type="date" {...register('plannedEndDate')} />
            </div>
          </div>

          {!task && (
            <div className="flex flex-col gap-1.5">
              <Label>Depends on task (optional)</Label>
              <Controller
                control={control}
                name="dependsOnTaskId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!workPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(siblingTasks?.items ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
