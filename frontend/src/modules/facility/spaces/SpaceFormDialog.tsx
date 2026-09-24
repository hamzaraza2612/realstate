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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { SpaceType, SpaceTypeLabel, type SpaceDto } from '@/types/api'
import { useCreateSpace, useUpdateSpace } from './api'

function toNumberOrNull(value: string | undefined) {
  if (!value) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  buildingBlock: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  type: z.string(),
  areaSize: z.string().optional(),
  capacity: z.string().optional(),
  rate: z.string().optional(),
  metadataJson: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function SpaceFormDialog({
  open,
  onOpenChange,
  space,
  defaultFacilityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  space?: SpaceDto
  defaultFacilityId?: string
}) {
  const createSpace = useCreateSpace()
  const updateSpace = useUpdateSpace()
  const { data: facilities } = useAllFacilities()

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
        space
          ? {
              facilityId: space.facilityId,
              buildingBlock: space.buildingBlock ?? '',
              code: space.code,
              type: String(space.type),
              areaSize: space.areaSize != null ? String(space.areaSize) : '',
              capacity: space.capacity != null ? String(space.capacity) : '',
              rate: space.rate != null ? String(space.rate) : '',
              metadataJson: space.metadataJson ?? '',
            }
          : {
              facilityId: defaultFacilityId ?? '',
              buildingBlock: '',
              code: '',
              type: String(SpaceType.Shop),
              areaSize: '',
              capacity: '',
              rate: '',
              metadataJson: '',
            },
      )
    }
  }, [open, space, defaultFacilityId, reset])

  async function onSubmit(values: FormValues) {
    const shared = {
      buildingBlock: values.buildingBlock || null,
      code: values.code,
      type: Number(values.type) as SpaceType,
      areaSize: toNumberOrNull(values.areaSize),
      capacity: toNumberOrNull(values.capacity),
      rate: toNumberOrNull(values.rate),
      metadataJson: values.metadataJson || null,
    }
    try {
      if (space) {
        await updateSpace.mutateAsync({ id: space.id, payload: shared })
        toast({ title: 'Space updated', variant: 'success' })
      } else {
        await createSpace.mutateAsync({ facilityId: values.facilityId, propertyUnitId: null, ...shared })
        toast({ title: 'Space created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${space ? 'update' : 'create'} space`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createSpace.isPending || updateSpace.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{space ? 'Edit space' : 'New space'}</DialogTitle>
          <DialogDescription>A generic rentable or usable space within a facility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Facility</Label>
            <Controller
              control={control}
              name="facilityId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!space}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {(facilities ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.code} · {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.facilityId && <p className="text-xs text-destructive">{errors.facilityId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="buildingBlock">Building / block (optional)</Label>
              <Input id="buildingBlock" {...register('buildingBlock')} />
            </div>
          </div>

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
                    {Object.entries(SpaceTypeLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="areaSize">Area size (optional)</Label>
              <Input id="areaSize" type="number" step="0.01" {...register('areaSize')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input id="capacity" type="number" step="1" {...register('capacity')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rate">Rate (optional)</Label>
              <Input id="rate" type="number" step="0.01" {...register('rate')} />
            </div>
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
              {isPending ? 'Saving…' : space ? 'Save changes' : 'Create space'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
