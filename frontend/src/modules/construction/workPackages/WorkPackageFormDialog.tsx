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
import { useAllProjects } from '@/modules/projects/api'
import { useUsers } from '@/modules/users/api'
import type { WorkPackageDto } from '@/types/api'
import { useCreateWorkPackage, useUpdateWorkPackage } from './api'

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  managerUserId: z.string().optional(),
  budget: z.string().min(1, 'Budget is required'),
})

type FormValues = z.infer<typeof schema>

const NONE = 'none'

export function WorkPackageFormDialog({
  open,
  onOpenChange,
  workPackage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workPackage?: WorkPackageDto
}) {
  const createWorkPackage = useCreateWorkPackage()
  const updateWorkPackage = useUpdateWorkPackage()
  const navigate = useNavigate()

  const { data: projects } = useAllProjects()
  const { data: users } = useUsers(1, '')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        workPackage
          ? {
              projectId: workPackage.projectId,
              name: workPackage.name,
              code: workPackage.code,
              description: workPackage.description ?? '',
              plannedStartDate: workPackage.plannedStartDate ?? '',
              plannedEndDate: workPackage.plannedEndDate ?? '',
              managerUserId: workPackage.managerUserId ?? NONE,
              budget: String(workPackage.budget),
            }
          : { projectId: '', name: '', code: '', description: '', plannedStartDate: '', plannedEndDate: '', managerUserId: NONE, budget: '' },
      )
    }
  }, [open, workPackage, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      projectId: values.projectId,
      name: values.name,
      code: values.code,
      description: values.description || null,
      plannedStartDate: values.plannedStartDate || null,
      plannedEndDate: values.plannedEndDate || null,
      managerUserId: values.managerUserId && values.managerUserId !== NONE ? values.managerUserId : null,
      budget: Number(values.budget),
    }
    try {
      if (workPackage) {
        await updateWorkPackage.mutateAsync({ id: workPackage.id, payload })
        toast({ title: 'Work package updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createWorkPackage.mutateAsync(payload)
        toast({ title: 'Work package created', variant: 'success' })
        onOpenChange(false)
        navigate(`/construction/work-packages/${created.id}`)
      }
    } catch (error) {
      toast({ title: `Could not ${workPackage ? 'update' : 'create'} work package`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createWorkPackage.isPending || updateWorkPackage.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{workPackage ? 'Edit work package' : 'New work package'}</DialogTitle>
          <DialogDescription>Group construction tasks under a project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!workPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && <p className="text-xs text-destructive">{errors.projectId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" {...register('description')} />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Manager (optional)</Label>
              <Controller
                control={control}
                name="managerUserId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" type="number" step="0.01" {...register('budget')} />
              {errors.budget && <p className="text-xs text-destructive">{errors.budget.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : workPackage ? 'Save changes' : 'Create work package'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
