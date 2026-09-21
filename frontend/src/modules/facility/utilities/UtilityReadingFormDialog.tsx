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
import { useAllProperties } from '@/modules/property/properties/api'
import { UtilityType, UtilityTypeLabel } from '@/types/api'
import { useCreateUtilityReading } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z
  .object({
    facilityId: z.string().optional(),
    propertyId: z.string().optional(),
    type: z.string(),
    meterReference: z.string().min(1, 'Meter reference is required'),
    readingValue: z.string().min(1, 'Reading value is required'),
    readingDate: z.string().min(1, 'Required'),
    ratePerUnit: z.string().optional(),
  })
  .refine((v) => (v.facilityId && v.facilityId !== NONE) || (v.propertyId && v.propertyId !== NONE), {
    message: 'Select either a facility or a property',
    path: ['facilityId'],
  })

type FormValues = z.infer<typeof schema>

export function UtilityReadingFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createReading = useCreateUtilityReading()
  const { data: facilities } = useAllFacilities()
  const { data: properties } = useAllProperties()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      facilityId: NONE,
      propertyId: NONE,
      type: String(UtilityType.Electricity),
      meterReference: '',
      readingValue: '',
      readingDate: today(),
      ratePerUnit: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        facilityId: NONE,
        propertyId: NONE,
        type: String(UtilityType.Electricity),
        meterReference: '',
        readingValue: '',
        readingDate: today(),
        ratePerUnit: '',
      })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createReading.mutateAsync({
        facilityId: values.facilityId && values.facilityId !== NONE ? values.facilityId : null,
        propertyId: values.propertyId && values.propertyId !== NONE ? values.propertyId : null,
        type: Number(values.type) as UtilityType,
        meterReference: values.meterReference,
        readingValue: Number(values.readingValue),
        readingDate: values.readingDate,
        ratePerUnit: values.ratePerUnit ? Number(values.ratePerUnit) : null,
      })
      toast({ title: 'Utility reading recorded', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record reading', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New utility reading</DialogTitle>
          <DialogDescription>Cumulative meters cannot decrease — the reading must be at or above the previous value.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Facility</Label>
              <Controller
                control={control}
                name="facilityId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
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
            <div className="flex flex-col gap-1.5">
              <Label>Property (alternative)</Label>
              <Controller
                control={control}
                name="propertyId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {(properties ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} · {p.name}
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
                      {Object.entries(UtilityTypeLabel).map(([value, label]) => (
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
              <Label htmlFor="meterReference">Meter reference</Label>
              <Input id="meterReference" {...register('meterReference')} />
              {errors.meterReference && <p className="text-xs text-destructive">{errors.meterReference.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="readingValue">Reading value</Label>
              <Input id="readingValue" type="number" step="0.01" {...register('readingValue')} />
              {errors.readingValue && <p className="text-xs text-destructive">{errors.readingValue.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="readingDate">Reading date</Label>
              <Input id="readingDate" type="date" {...register('readingDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ratePerUnit">Rate per unit (optional)</Label>
              <Input id="ratePerUnit" type="number" step="0.01" {...register('ratePerUnit')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createReading.isPending}>
              {createReading.isPending ? 'Saving…' : 'Record reading'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
