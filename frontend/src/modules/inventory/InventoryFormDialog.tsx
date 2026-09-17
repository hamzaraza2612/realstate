import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { InventoryAreaUnit, InventoryAreaUnitLabel, InventoryUnitType, InventoryUnitTypeLabel } from '@/types/api'
import { useAllProjects } from '@/modules/projects/api'
import { useProjectNodes } from '@/modules/projects/nodes/api'
import { useCreateInventoryUnit } from './api'

const NONE = 'none'

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  nodeId: z.string(),
  code: z.string().min(1, 'Code is required'),
  type: z.string(),
  areaSize: z.string().optional(),
  areaUnit: z.string(),
})

type FormValues = z.infer<typeof schema>

export function InventoryFormDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultProjectId?: string
}) {
  const createUnit = useCreateInventoryUnit()
  const navigate = useNavigate()
  const { data: projects } = useAllProjects()
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId ?? '')
  const { data: nodes } = useProjectNodes(selectedProjectId || undefined)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: defaultProjectId ?? '',
      nodeId: NONE,
      type: String(InventoryUnitType.Plot),
      areaUnit: String(InventoryAreaUnit.SqFt),
    },
  })

  const watchedProjectId = watch('projectId')
  useEffect(() => {
    setSelectedProjectId(watchedProjectId)
  }, [watchedProjectId])

  useEffect(() => {
    if (open) {
      reset({
        projectId: defaultProjectId ?? '',
        nodeId: NONE,
        code: '',
        type: String(InventoryUnitType.Plot),
        areaSize: '',
        areaUnit: String(InventoryAreaUnit.SqFt),
      })
      setSelectedProjectId(defaultProjectId ?? '')
    }
  }, [open, defaultProjectId, reset])

  async function onSubmit(values: FormValues) {
    try {
      const unit = await createUnit.mutateAsync({
        projectId: values.projectId,
        nodeId: values.nodeId === NONE ? null : values.nodeId,
        code: values.code,
        type: Number(values.type) as InventoryUnitType,
        areaSize: values.areaSize ? Number(values.areaSize) : null,
        areaUnit: values.areaSize ? (Number(values.areaUnit) as InventoryAreaUnit) : null,
        latitude: null,
        longitude: null,
        geoJson: null,
        metadataJson: null,
      })
      toast({ title: 'Inventory unit created', variant: 'success' })
      onOpenChange(false)
      navigate(`/inventory/${unit.id}`)
    } catch (error) {
      toast({ title: 'Could not create inventory unit', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add inventory unit</DialogTitle>
          <DialogDescription>Add a plot, apartment, office, shop or house to a project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Project</Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.code})
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
              <Label htmlFor="code">Code / number</Label>
              <Input id="code" placeholder="e.g. A-101" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Hierarchy node (optional)</Label>
              <Controller
                control={control}
                name="nodeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(nodes ?? []).map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(InventoryUnitTypeLabel).map(([value, label]) => (
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
              <Label htmlFor="areaSize">Area (optional)</Label>
              <Input id="areaSize" type="number" step="0.01" {...register('areaSize')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit</Label>
              <Controller
                control={control}
                name="areaUnit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(InventoryAreaUnitLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUnit.isPending}>
              {createUnit.isPending ? 'Creating…' : 'Create unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
