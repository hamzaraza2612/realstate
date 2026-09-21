import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { useAllProperties } from '@/modules/property/properties/api'
import { useAllTenants } from '@/modules/property/tenants/api'
import { useUnitsByProperty } from '@/modules/property/units/api'
import { LeasePaymentFrequency, LeasePaymentFrequencyLabel, PropertyUnitStatus, type LeaseDto } from '@/types/api'
import { useCreateLease, useUpdateLease } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z
  .object({
    propertyId: z.string().min(1, 'Property is required'),
    unitId: z.string().min(1, 'Unit is required'),
    rentalTenantId: z.string().min(1, 'Tenant is required'),
    startDate: z.string().min(1, 'Required'),
    endDate: z.string().min(1, 'Required'),
    rentAmount: z.string().min(1, 'Required'),
    securityDeposit: z.string().optional(),
    paymentFrequency: z.string(),
    gracePeriodDays: z.string().min(1, 'Required'),
    terms: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.endDate > v.startDate, { message: 'End date must be after start date', path: ['endDate'] })

type FormValues = z.infer<typeof schema>

export function LeaseFormDialog({ open, onOpenChange, lease }: { open: boolean; onOpenChange: (open: boolean) => void; lease?: LeaseDto }) {
  const createLease = useCreateLease()
  const updateLease = useUpdateLease()
  const navigate = useNavigate()

  const { data: properties } = useAllProperties()
  const { data: tenants } = useAllTenants()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: '',
      unitId: '',
      rentalTenantId: '',
      startDate: today(),
      endDate: '',
      rentAmount: '',
      securityDeposit: '',
      paymentFrequency: String(LeasePaymentFrequency.Monthly),
      gracePeriodDays: '0',
      terms: '',
      notes: '',
    },
  })

  const propertyId = watch('propertyId')
  const { data: units } = useUnitsByProperty(propertyId || undefined)
  const availableUnits = (units ?? []).filter(
    (u) => u.status === PropertyUnitStatus.Available || u.status === PropertyUnitStatus.Reserved || u.id === lease?.unitId,
  )

  useEffect(() => {
    if (open) {
      reset(
        lease
          ? {
              propertyId: lease.propertyId,
              unitId: lease.unitId,
              rentalTenantId: lease.rentalTenantId,
              startDate: lease.startDate,
              endDate: lease.endDate,
              rentAmount: String(lease.rentAmount),
              securityDeposit: lease.securityDeposit != null ? String(lease.securityDeposit) : '',
              paymentFrequency: String(lease.paymentFrequency),
              gracePeriodDays: String(lease.gracePeriodDays),
              terms: lease.terms ?? '',
              notes: lease.notes ?? '',
            }
          : {
              propertyId: '',
              unitId: '',
              rentalTenantId: '',
              startDate: today(),
              endDate: '',
              rentAmount: '',
              securityDeposit: '',
              paymentFrequency: String(LeasePaymentFrequency.Monthly),
              gracePeriodDays: '0',
              terms: '',
              notes: '',
            },
      )
    }
  }, [open, lease, reset])

  async function onSubmit(values: FormValues) {
    const shared = {
      startDate: values.startDate,
      endDate: values.endDate,
      rentAmount: Number(values.rentAmount),
      securityDeposit: values.securityDeposit ? Number(values.securityDeposit) : 0,
      paymentFrequency: Number(values.paymentFrequency) as LeasePaymentFrequency,
      gracePeriodDays: Number(values.gracePeriodDays) || 0,
      terms: values.terms || null,
      notes: values.notes || null,
    }
    try {
      if (lease) {
        await updateLease.mutateAsync({ id: lease.id, payload: shared })
        toast({ title: 'Lease updated', variant: 'success' })
        onOpenChange(false)
      } else {
        const created = await createLease.mutateAsync({
          propertyId: values.propertyId,
          unitId: values.unitId,
          rentalTenantId: values.rentalTenantId,
          ...shared,
        })
        toast({ title: 'Lease created', variant: 'success' })
        onOpenChange(false)
        navigate(`/property/leases/${created.id}`)
      }
    } catch (error) {
      toast({ title: `Could not ${lease ? 'update' : 'create'} lease`, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createLease.isPending || updateLease.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lease ? 'Edit lease' : 'New lease'}</DialogTitle>
          <DialogDescription>Draft leases can be edited freely until submitted for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
          {!lease && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Property</Label>
                <Controller
                  control={control}
                  name="propertyId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v)
                        setValue('unitId', '')
                      }}
                    >
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
              <div className="flex flex-col gap-1.5">
                <Label>Unit</Label>
                <Controller
                  control={control}
                  name="unitId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!propertyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.unitNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
              </div>
            </div>
          )}

          {!lease && (
            <div className="flex flex-col gap-1.5">
              <Label>Tenant</Label>
              <Controller
                control={control}
                name="rentalTenantId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {(tenants ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.customerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.rentalTenantId && <p className="text-xs text-destructive">{errors.rentalTenantId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rentAmount">Rent amount</Label>
              <Input id="rentAmount" type="number" step="0.01" {...register('rentAmount')} />
              {errors.rentAmount && <p className="text-xs text-destructive">{errors.rentAmount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="securityDeposit">Security deposit (optional)</Label>
              <Input id="securityDeposit" type="number" step="0.01" {...register('securityDeposit')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Payment frequency</Label>
              <Controller
                control={control}
                name="paymentFrequency"
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
              <Input id="gracePeriodDays" type="number" step="1" {...register('gracePeriodDays')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="terms">Terms (optional)</Label>
            <Textarea id="terms" {...register('terms')} />
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
              {isPending ? 'Saving…' : lease ? 'Save changes' : 'Create lease'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
