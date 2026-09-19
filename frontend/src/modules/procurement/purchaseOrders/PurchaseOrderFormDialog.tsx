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
import { useAllPurchaseRequests } from '@/modules/procurement/purchaseRequests/api'
import { useAllVendors } from '@/modules/procurement/vendors/api'
import { PurchaseRequestStatus, type PurchaseOrderDto } from '@/types/api'
import { useCreatePurchaseOrder, useUpdatePurchaseOrder } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const lineSchema = z.object({
  materialId: z.string().optional(),
  itemDescription: z.string().min(1, 'Required'),
  unitOfMeasure: z.string().min(1, 'Required'),
  quantity: z.string().min(1, 'Required'),
  unitPrice: z.string().min(1, 'Required'),
})

const schema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  projectId: z.string().min(1, 'Project is required'),
  workPackageId: z.string().optional(),
  purchaseRequestId: z.string().optional(),
  orderDate: z.string().min(1, 'Required'),
  expectedDeliveryDate: z.string().optional(),
  discount: z.string(),
  taxAmount: z.string(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line item is required'),
})

type FormValues = z.infer<typeof schema>

const emptyLine = { materialId: NONE, itemDescription: '', unitOfMeasure: '', quantity: '', unitPrice: '' }

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrder?: PurchaseOrderDto
}) {
  const createOrder = useCreatePurchaseOrder()
  const updateOrder = useUpdatePurchaseOrder()
  const navigate = useNavigate()

  const { data: vendors } = useAllVendors()
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
    defaultValues: {
      vendorId: '',
      projectId: '',
      workPackageId: NONE,
      purchaseRequestId: NONE,
      orderDate: today(),
      expectedDeliveryDate: '',
      discount: '0',
      taxAmount: '0',
      notes: '',
      lines: [emptyLine],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const projectId = watch('projectId')
  const { data: workPackages } = useAllWorkPackages(projectId || undefined)
  const { data: approvedRequests } = useAllPurchaseRequests(projectId || undefined, PurchaseRequestStatus.Approved)

  useEffect(() => {
    if (open) {
      reset(
        purchaseOrder
          ? {
              vendorId: purchaseOrder.vendorId,
              projectId: purchaseOrder.projectId,
              workPackageId: purchaseOrder.workPackageId ?? NONE,
              purchaseRequestId: purchaseOrder.purchaseRequestId ?? NONE,
              orderDate: purchaseOrder.orderDate,
              expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ?? '',
              discount: String(purchaseOrder.discount),
              taxAmount: String(purchaseOrder.taxAmount),
              notes: purchaseOrder.notes ?? '',
              lines: purchaseOrder.lines.map((l) => ({
                materialId: l.materialId ?? NONE,
                itemDescription: l.itemDescription,
                unitOfMeasure: l.unitOfMeasure,
                quantity: String(l.quantity),
                unitPrice: String(l.unitPrice),
              })),
            }
          : {
              vendorId: '',
              projectId: '',
              workPackageId: NONE,
              purchaseRequestId: NONE,
              orderDate: today(),
              expectedDeliveryDate: '',
              discount: '0',
              taxAmount: '0',
              notes: '',
              lines: [emptyLine],
            },
      )
    }
  }, [open, purchaseOrder, reset])

  async function onSubmit(values: FormValues) {
    const lines = values.lines.map((l) => ({
      materialId: l.materialId && l.materialId !== NONE ? l.materialId : null,
      itemDescription: l.itemDescription,
      unitOfMeasure: l.unitOfMeasure,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    }))
    try {
      if (purchaseOrder) {
        await updateOrder.mutateAsync({
          id: purchaseOrder.id,
          payload: {
            orderDate: values.orderDate,
            expectedDeliveryDate: values.expectedDeliveryDate || null,
            discount: Number(values.discount) || 0,
            taxAmount: Number(values.taxAmount) || 0,
            notes: values.notes || null,
            lines,
          },
        })
        toast({ title: 'Purchase order updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createOrder.mutateAsync({
          vendorId: values.vendorId,
          projectId: values.projectId,
          workPackageId: values.workPackageId && values.workPackageId !== NONE ? values.workPackageId : null,
          purchaseRequestId: values.purchaseRequestId && values.purchaseRequestId !== NONE ? values.purchaseRequestId : null,
          orderDate: values.orderDate,
          expectedDeliveryDate: values.expectedDeliveryDate || null,
          discount: Number(values.discount) || 0,
          taxAmount: Number(values.taxAmount) || 0,
          notes: values.notes || null,
          lines,
        })
        toast({ title: 'Purchase order created', variant: 'success' })
        onOpenChange(false)
        navigate(`/procurement/purchase-orders/${created.id}`)
      }
    } catch (error) {
      toast({ title: `Could not ${purchaseOrder ? 'update' : 'create'} purchase order`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createOrder.isPending || updateOrder.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{purchaseOrder ? 'Edit purchase order' : 'New purchase order'}</DialogTitle>
          <DialogDescription>Order line items from a vendor, optionally linked to an approved purchase request.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Vendor</Label>
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!purchaseOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vendorId && <p className="text-xs text-destructive">{errors.vendorId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!purchaseOrder}>
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
          </div>

          {!purchaseOrder && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Work package (optional)</Label>
                <Controller
                  control={control}
                  name="workPackageId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
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
              <div className="flex flex-col gap-1.5">
                <Label>Purchase request (optional)</Label>
                <Controller
                  control={control}
                  name="purchaseRequestId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!projectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {(approvedRequests ?? []).map((pr) => (
                          <SelectItem key={pr.id} value={pr.id}>
                            {pr.requestNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orderDate">Order date</Label>
              <Input id="orderDate" type="date" {...register('orderDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedDeliveryDate">Expected delivery (optional)</Label>
              <Input id="expectedDeliveryDate" type="date" {...register('expectedDeliveryDate')} />
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
                <Input type="number" step="0.01" placeholder="Unit price" {...register(`lines.${index}.unitPrice` as const)} />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input id="discount" type="number" step="0.01" {...register('discount')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxAmount">Tax amount</Label>
              <Input id="taxAmount" type="number" step="0.01" {...register('taxAmount')} />
            </div>
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
              {isPending ? 'Saving…' : purchaseOrder ? 'Save changes' : 'Create order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
