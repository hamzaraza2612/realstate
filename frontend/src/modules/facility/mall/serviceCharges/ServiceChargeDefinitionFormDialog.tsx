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
import {
  FacilityType,
  LeasePaymentFrequency,
  LeasePaymentFrequencyLabel,
  ServiceChargeCalculationType,
  ServiceChargeCalculationTypeLabel,
  type ServiceChargeDefinitionDto,
} from '@/types/api'
import { useCreateServiceChargeDefinition, useUpdateServiceChargeDefinition } from './api'

const schema = z.object({
  facilityId: z.string().min(1, 'Facility is required'),
  name: z.string().min(1, 'Name is required'),
  calculationType: z.string(),
  amount: z.string().min(1, 'Amount is required'),
  billingFrequency: z.string(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function ServiceChargeDefinitionFormDialog({
  open,
  onOpenChange,
  definition,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition?: ServiceChargeDefinitionDto
}) {
  const createDefinition = useCreateServiceChargeDefinition()
  const updateDefinition = useUpdateServiceChargeDefinition()
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)

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
        definition
          ? {
              facilityId: definition.facilityId,
              name: definition.name,
              calculationType: String(definition.calculationType),
              amount: String(definition.amount),
              billingFrequency: String(definition.billingFrequency),
              isActive: definition.isActive,
            }
          : {
              facilityId: '',
              name: '',
              calculationType: String(ServiceChargeCalculationType.FixedAmount),
              amount: '',
              billingFrequency: String(LeasePaymentFrequency.Monthly),
              isActive: true,
            },
      )
    }
  }, [open, definition, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (definition) {
        await updateDefinition.mutateAsync({
          id: definition.id,
          payload: {
            name: values.name,
            amount: Number(values.amount),
            billingFrequency: Number(values.billingFrequency) as LeasePaymentFrequency,
            isActive: values.isActive,
          },
        })
        toast({ title: 'Service charge definition updated', variant: 'success' })
      } else {
        await createDefinition.mutateAsync({
          facilityId: values.facilityId,
          name: values.name,
          calculationType: Number(values.calculationType) as ServiceChargeCalculationType,
          amount: Number(values.amount),
          billingFrequency: Number(values.billingFrequency) as LeasePaymentFrequency,
        })
        toast({ title: 'Service charge definition created', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: `Could not ${definition ? 'update' : 'create'} definition`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createDefinition.isPending || updateDefinition.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{definition ? 'Edit service charge definition' : 'New service charge definition'}</DialogTitle>
          <DialogDescription>Defines a recurring charge that can be generated against leases in a mall facility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!definition && (
            <div className="flex flex-col gap-1.5">
              <Label>Facility</Label>
              <Controller
                control={control}
                name="facilityId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mall facility" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Calculation type</Label>
              <Controller
                control={control}
                name="calculationType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!definition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ServiceChargeCalculationTypeLabel).map(([value, label]) => (
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
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Billing frequency</Label>
            <Controller
              control={control}
              name="billingFrequency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LeasePaymentFrequencyLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {definition && (
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
              {isPending ? 'Saving…' : definition ? 'Save changes' : 'Create definition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
