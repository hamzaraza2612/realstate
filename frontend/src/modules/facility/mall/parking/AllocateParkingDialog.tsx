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
import { useAllTenants } from '@/modules/property/tenants/api'
import type { ParkingSpaceDto } from '@/types/api'
import { useCreateParkingAllocation } from './api'

const NONE = 'none'
const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  rentalTenantId: z.string().optional(),
  vehicleReference: z.string().optional(),
  startDate: z.string().min(1, 'Required'),
  amount: z.string().min(1, 'Amount is required'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function AllocateParkingDialog({
  open,
  onOpenChange,
  space,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  space?: ParkingSpaceDto
}) {
  const createAllocation = useCreateParkingAllocation()
  const { data: tenants } = useAllTenants()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rentalTenantId: NONE, vehicleReference: '', startDate: today(), amount: '', notes: '' },
  })

  useEffect(() => {
    if (open) reset({ rentalTenantId: NONE, vehicleReference: '', startDate: today(), amount: '', notes: '' })
  }, [open, reset])

  if (!space) return null

  async function onSubmit(values: FormValues) {
    if (!space) return
    try {
      await createAllocation.mutateAsync({
        parkingSpaceId: space.id,
        rentalTenantId: values.rentalTenantId && values.rentalTenantId !== NONE ? values.rentalTenantId : null,
        vehicleReference: values.vehicleReference || null,
        startDate: values.startDate,
        amount: Number(values.amount),
        notes: values.notes || null,
      })
      toast({ title: 'Parking space allocated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not allocate parking space', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allocate {space.code}</DialogTitle>
          <DialogDescription>Allocate this parking space to a tenant.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tenant (optional)</Label>
            <Controller
              control={control}
              name="rentalTenantId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(tenants ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.customerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleReference">Vehicle reference (optional)</Label>
            <Input id="vehicleReference" {...register('vehicleReference')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAllocation.isPending}>
              {createAllocation.isPending ? 'Saving…' : 'Allocate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
