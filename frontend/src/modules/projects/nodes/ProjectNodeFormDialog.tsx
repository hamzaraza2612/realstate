import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { ProjectNodeDto } from '@/types/api'
import { ProjectNodeType, ProjectNodeTypeLabel } from '@/types/api'
import { useCreateProjectNode } from './api'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  nodeType: z.string(),
  parentNodeId: z.string(),
})

type FormValues = z.infer<typeof schema>

const NONE = 'none'

export function ProjectNodeFormDialog({
  open,
  onOpenChange,
  projectId,
  nodes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  nodes: ProjectNodeDto[]
}) {
  const createNode = useCreateProjectNode()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nodeType: String(ProjectNodeType.Phase), parentNodeId: NONE },
  })

  useEffect(() => {
    if (open) {
      reset({ name: '', code: '', nodeType: String(ProjectNodeType.Phase), parentNodeId: NONE })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createNode.mutateAsync({
        projectId,
        parentNodeId: values.parentNodeId === NONE ? null : values.parentNodeId,
        nodeType: Number(values.nodeType) as ProjectNodeType,
        name: values.name,
        code: values.code,
        sortOrder: 0,
        latitude: null,
        longitude: null,
        geoJson: null,
        metadataJson: null,
      })
      toast({ title: 'Hierarchy node added', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not add node', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add hierarchy node</DialogTitle>
          <DialogDescription>Add a phase, zone, block, building or floor to this project's structure.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g. Phase 1" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="e.g. P1" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Level</Label>
              <Controller
                control={control}
                name="nodeType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ProjectNodeTypeLabel).map(([value, label]) => (
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
              <Label>Parent node</Label>
              <Controller
                control={control}
                name="parentNodeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No parent (top level)</SelectItem>
                      {nodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {ProjectNodeTypeLabel[node.nodeType]}: {node.name}
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
            <Button type="submit" disabled={createNode.isPending}>
              {createNode.isPending ? 'Adding…' : 'Add node'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
