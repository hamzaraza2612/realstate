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
import { FacilityType, type MembershipPlanDto } from '@/types/api'
import { useCreatePlan, useUpdatePlan } from './api'

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  name: z.string().min(1, 'Name is required'),
  durationDays: z.string().min(1, 'Duration is required'),
  price: z.string().min(1, 'Price is required'),
  includedHoursCredits: z.string().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function PlanFormDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (open: boolean) => void; plan?: MembershipPlanDto }) {
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const { data: facilities } = useAllFacilities(FacilityType.Coworking)

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
        plan
          ? {
              facilityId: plan.facilityId,
              name: plan.name,
              durationDays: String(plan.durationDays),
              price: String(plan.price),
              includedHoursCredits: plan.includedHoursCredits != null ? String(plan.includedHoursCredits) : '',
              isActive: plan.isActive,
            }
          : { facilityId: '', name: '', durationDays: '30', price: '', includedHoursCredits: '', isActive: true },
      )
    }
  }, [open, plan, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (plan) {
        await updatePlan.mutateAsync({
          id: plan.id,
          payload: {
            name: values.name,
            price: Number(values.price),
            includedHoursCredits: values.includedHoursCredits ? Number(values.includedHoursCredits) : null,
            isActive: values.isActive,
          },
        })
        toast({ title: 'Plan updated', variant: 'success' })
      } else {
        await createPlan.mutateAsync({
          facilityId: values.facilityId,
          name: values.name,
          durationDays: Number(values.durationDays),
          price: Number(values.price),
          includedHoursCredits: values.includedHoursCredits ? Number(values.includedHoursCredits) : null,
        })
        toast({ title: 'Plan created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${plan ? 'update' : 'create'} plan`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit membership plan' : 'New membership plan'}</DialogTitle>
          <DialogDescription>Membership plans define price, duration and included hours for coworking members.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!plan && (
            <div className="flex flex-col gap-1.5">
              <Label>Facility</Label>
              <Controller
                control={control}
                name="facilityId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a coworking facility" />
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
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input id="durationDays" type="number" step="1" {...register('durationDays')} disabled={!!plan} />
              {errors.durationDays && <p className="text-xs text-destructive">{errors.durationDays.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="includedHoursCredits">Included hours (optional)</Label>
              <Input id="includedHoursCredits" type="number" step="1" {...register('includedHoursCredits')} />
            </div>
          </div>

          {plan && (
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
              {isPending ? 'Saving…' : plan ? 'Save changes' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
