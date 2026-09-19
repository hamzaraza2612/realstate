import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { MaterialDto } from '@/types/api'
import { useCreateMaterial, useUpdateMaterial } from './api'

const schema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  category: z.string().optional(),
  minimumQuantity: z.string().min(1, 'Required'),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function MaterialFormDialog({ open, onOpenChange, material }: { open: boolean; onOpenChange: (open: boolean) => void; material?: MaterialDto }) {
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        material
          ? {
              sku: material.sku,
              name: material.name,
              unitOfMeasure: material.unitOfMeasure,
              category: material.category ?? '',
              minimumQuantity: String(material.minimumQuantity),
              isActive: material.isActive,
            }
          : { sku: '', name: '', unitOfMeasure: '', category: '', minimumQuantity: '0', isActive: true },
      )
    }
  }, [open, material, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (material) {
        await updateMaterial.mutateAsync({
          id: material.id,
          payload: {
            name: values.name,
            category: values.category || null,
            minimumQuantity: Number(values.minimumQuantity),
            isActive: values.isActive,
          },
        })
        toast({ title: 'Material updated', variant: 'success' })
      } else {
        await createMaterial.mutateAsync({
          sku: values.sku,
          name: values.name,
          unitOfMeasure: values.unitOfMeasure,
          category: values.category || null,
          minimumQuantity: Number(values.minimumQuantity),
        })
        toast({ title: 'Material created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${material ? 'update' : 'create'} material`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createMaterial.isPending || updateMaterial.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{material ? 'Edit material' : 'New material'}</DialogTitle>
          <DialogDescription>Materials tracked in stock for construction and procurement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} disabled={!!material} />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitOfMeasure">Unit of measure</Label>
              <Input id="unitOfMeasure" placeholder="e.g. bag, m³, unit" {...register('unitOfMeasure')} disabled={!!material} />
              {errors.unitOfMeasure && <p className="text-xs text-destructive">{errors.unitOfMeasure.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category (optional)</Label>
              <Input id="category" {...register('category')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minimumQuantity">Minimum quantity</Label>
              <Input id="minimumQuantity" type="number" step="0.01" {...register('minimumQuantity')} />
            </div>
          </div>

          {material && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" {...register('isActive')} />
              Active
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : material ? 'Save changes' : 'Create material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
