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
import { useAllProperties } from '@/modules/property/properties/api'
import { PropertyUnitType, PropertyUnitTypeLabel, type PropertyUnitDto } from '@/types/api'
import { useCreateUnit, useUpdateUnit } from './api'

const schema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  buildingBlock: z.string().optional(),
  unitNumber: z.string().min(1, 'Unit number is required'),
  type: z.string(),
  floor: z.string().optional(),
  areaSize: z.string().optional(),
  areaUnit: z.string().optional(),
  bedrooms: z.string().optional(),
  marketRentRate: z.string().optional(),
  metadataJson: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function toNumberOrNull(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function UnitFormDialog({
  open,
  onOpenChange,
  unit,
  defaultPropertyId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: PropertyUnitDto
  defaultPropertyId?: string
}) {
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()
  const { data: properties } = useAllProperties()

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
        unit
          ? {
              propertyId: unit.propertyId,
              buildingBlock: unit.buildingBlock ?? '',
              unitNumber: unit.unitNumber,
              type: String(unit.type),
              floor: unit.floor != null ? String(unit.floor) : '',
              areaSize: unit.areaSize != null ? String(unit.areaSize) : '',
              areaUnit: unit.areaUnit ?? '',
              bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : '',
              marketRentRate: unit.marketRentRate != null ? String(unit.marketRentRate) : '',
              metadataJson: unit.metadataJson ?? '',
            }
          : {
              propertyId: defaultPropertyId ?? '',
              buildingBlock: '',
              unitNumber: '',
              type: String(PropertyUnitType.Apartment),
              floor: '',
              areaSize: '',
              areaUnit: '',
              bedrooms: '',
              marketRentRate: '',
              metadataJson: '',
            },
      )
    }
  }, [open, unit, defaultPropertyId, reset])

  async function onSubmit(values: FormValues) {
    const shared = {
      buildingBlock: values.buildingBlock || null,
      unitNumber: values.unitNumber,
      type: Number(values.type) as PropertyUnitType,
      floor: values.floor?.trim() ? values.floor.trim() : null,
      areaSize: toNumberOrNull(values.areaSize),
      areaUnit: values.areaUnit || null,
      bedrooms: toNumberOrNull(values.bedrooms),
      marketRentRate: toNumberOrNull(values.marketRentRate),
      metadataJson: values.metadataJson || null,
    }
    try {
      if (unit) {
        await updateUnit.mutateAsync({ id: unit.id, payload: shared })
        toast({ title: 'Unit updated', variant: 'success' })
      } else {
        await createUnit.mutateAsync({ propertyId: values.propertyId, ...shared })
        toast({ title: 'Unit created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${unit ? 'update' : 'create'} unit`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createUnit.isPending || updateUnit.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit unit' : 'New unit'}</DialogTitle>
          <DialogDescription>Units belong to a property and can be leased to tenants.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Property</Label>
            <Controller
              control={control}
              name="propertyId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!unit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {(properties ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.propertyId && <p className="text-xs text-destructive">{errors.propertyId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitNumber">Unit number</Label>
              <Input id="unitNumber" {...register('unitNumber')} />
              {errors.unitNumber && <p className="text-xs text-destructive">{errors.unitNumber.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buildingBlock">Building / block (optional)</Label>
              <Input id="buildingBlock" {...register('buildingBlock')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
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
                      {Object.entries(PropertyUnitTypeLabel).map(([value, label]) => (
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
              <Label htmlFor="floor">Floor (optional)</Label>
              <Input id="floor" type="text" placeholder="e.g. Ground, 1, PH" {...register('floor')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="areaSize">Area size (optional)</Label>
              <Input id="areaSize" type="number" step="0.01" {...register('areaSize')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="areaUnit">Area unit (optional)</Label>
              <Input id="areaUnit" placeholder="SqFt" {...register('areaUnit')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bedrooms">Bedrooms (optional)</Label>
              <Input id="bedrooms" type="number" step="1" {...register('bedrooms')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="marketRentRate">Market rent rate (optional)</Label>
            <Input id="marketRentRate" type="number" step="0.01" {...register('marketRentRate')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="metadataJson">Metadata (optional)</Label>
            <Input id="metadataJson" placeholder="Free-form notes or JSON" {...register('metadataJson')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : unit ? 'Save changes' : 'Create unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
