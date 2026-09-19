import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
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
import { useAllWorkPackages } from '@/modules/construction/workPackages/api'
import { useAllMaterials } from '@/modules/procurement/materials/api'
import { PurchasePriority, PurchasePriorityLabel, type PurchaseRequestDto } from '@/types/api'
import { useCreatePurchaseRequest, useUpdatePurchaseRequest } from './api'

const NONE = 'none'

const lineSchema = z.object({
  materialId: z.string().optional(),
  itemDescription: z.string().min(1, 'Required'),
  unitOfMeasure: z.string().min(1, 'Required'),
  quantity: z.string().min(1, 'Required'),
  estimatedUnitPrice: z.string().min(1, 'Required'),
})

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  workPackageId: z.string().optional(),
  requiredDate: z.string().optional(),
  priority: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line item is required'),
})

type FormValues = z.infer<typeof schema>

const emptyLine = { materialId: NONE, itemDescription: '', unitOfMeasure: '', quantity: '', estimatedUnitPrice: '' }

export function PurchaseRequestFormDialog({
  open,
  onOpenChange,
  purchaseRequest,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseRequest?: PurchaseRequestDto
}) {
  const createRequest = useCreatePurchaseRequest()
  const updateRequest = useUpdatePurchaseRequest()
  const navigate = useNavigate()

  const { data: projects } = useAllProjects()
  const { data: materials } = useAllMaterials()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: '', workPackageId: NONE, requiredDate: '', priority: String(PurchasePriority.Medium), notes: '', lines: [emptyLine] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const projectId = watch('projectId')
  const { data: workPackages } = useAllWorkPackages(projectId || undefined)

  useEffect(() => {
    if (open) {
      reset(
        purchaseRequest
          ? {
              projectId: purchaseRequest.projectId,
              workPackageId: purchaseRequest.workPackageId ?? NONE,
              requiredDate: purchaseRequest.requiredDate ?? '',
              priority: String(purchaseRequest.priority),
              notes: purchaseRequest.notes ?? '',
              lines: purchaseRequest.lines.map((l) => ({
                materialId: l.materialId ?? NONE,
                itemDescription: l.itemDescription,
                unitOfMeasure: l.unitOfMeasure,
                quantity: String(l.quantity),
                estimatedUnitPrice: String(l.estimatedUnitPrice),
              })),
            }
          : { projectId: '', workPackageId: NONE, requiredDate: '', priority: String(PurchasePriority.Medium), notes: '', lines: [emptyLine] },
      )
    }
  }, [open, purchaseRequest, reset])

  async function onSubmit(values: FormValues) {
    const lines = values.lines.map((l) => ({
      materialId: l.materialId && l.materialId !== NONE ? l.materialId : null,
      itemDescription: l.itemDescription,
      unitOfMeasure: l.unitOfMeasure,
      quantity: Number(l.quantity),
      estimatedUnitPrice: Number(l.estimatedUnitPrice),
    }))
    try {
      if (purchaseRequest) {
        await updateRequest.mutateAsync({
          id: purchaseRequest.id,
          payload: {
            requiredDate: values.requiredDate || null,
            priority: Number(values.priority) as PurchasePriority,
            notes: values.notes || null,
            lines,
          },
        })
        toast({ title: 'Purchase request updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createRequest.mutateAsync({
          projectId: values.projectId,
          workPackageId: values.workPackageId && values.workPackageId !== NONE ? values.workPackageId : null,
          requiredDate: values.requiredDate || null,
          priority: Number(values.priority) as PurchasePriority,
          notes: values.notes || null,
          lines,
        })
        toast({ title: 'Purchase request created', variant: 'success' })
        onOpenChange(false)
        navigate(`/procurement/purchase-requests/${created.id}`)
      }
    } catch (error) {
      toast({ title: `Could not ${purchaseRequest ? 'update' : 'create'} purchase request`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createRequest.isPending || updateRequest.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{purchaseRequest ? 'Edit purchase request' : 'New purchase request'}</DialogTitle>
          <DialogDescription>Line items requested for a project, routed for approval before ordering.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!purchaseRequest}>
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
            <div className="flex flex-col gap-1.5">
              <Label>Work package (optional)</Label>
              <Controller
                control={control}
                name="workPackageId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!purchaseRequest || !projectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(workPackages ?? []).map((wp) => (
                        <SelectItem key={wp.id} value={wp.id}>
                          {wp.code} · {wp.name}
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
              <Label htmlFor="requiredDate">Required by (optional)</Label>
              <Input id="requiredDate" type="date" {...register('requiredDate')} />
            </div>
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
                      {Object.entries(PurchasePriorityLabel).map(([value, label]) => (
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

          <div className="flex flex-col gap-2">
            <Label>Line items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_110px_90px_90px_auto] items-start gap-2">
                <div className="flex flex-col gap-1">
                  <Controller
                    control={control}
                    name={`lines.${index}.materialId` as const}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Material (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Custom item</SelectItem>
                          {(materials ?? []).map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.sku} · {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input placeholder="Item description" {...register(`lines.${index}.itemDescription` as const)} />
                  {errors.lines?.[index]?.itemDescription && (
                    <p className="text-xs text-destructive">{errors.lines[index]?.itemDescription?.message}</p>
                  )}
                </div>
                <Input placeholder="Unit" {...register(`lines.${index}.unitOfMeasure` as const)} />
                <Input type="number" step="0.01" placeholder="Qty" {...register(`lines.${index}.quantity` as const)} />
                <Input type="number" step="0.01" placeholder="Unit price" {...register(`lines.${index}.estimatedUnitPrice` as const)} />
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length <= 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {errors.lines?.message && <p className="text-xs text-destructive">{errors.lines.message}</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine)}>
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : purchaseRequest ? 'Save changes' : 'Create request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
