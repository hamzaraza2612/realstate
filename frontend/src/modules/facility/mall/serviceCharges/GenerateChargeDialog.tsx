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
import { useLeases } from '@/modules/property/leases/api'
import { useGenerateServiceCharge, useServiceChargeDefinitions } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z
  .object({
    serviceChargeDefinitionId: z.string().min(1, 'Definition is required'),
    leaseId: z.string().min(1, 'Lease is required'),
    periodStart: z.string().min(1, 'Required'),
    periodEnd: z.string().min(1, 'Required'),
    dueDate: z.string().min(1, 'Required'),
  })
  .refine((v) => v.periodEnd >= v.periodStart, { message: 'Period end must be after period start', path: ['periodEnd'] })

type FormValues = z.infer<typeof schema>

export function GenerateChargeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const generateCharge = useGenerateServiceCharge()
  const { data: definitions } = useServiceChargeDefinitions({ isActive: true })
  const { data: leases } = useLeases(1, {})

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serviceChargeDefinitionId: '', leaseId: '', periodStart: today(), periodEnd: today(), dueDate: today() },
  })

  useEffect(() => {
    if (open) reset({ serviceChargeDefinitionId: '', leaseId: '', periodStart: today(), periodEnd: today(), dueDate: today() })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await generateCharge.mutateAsync(values)
      toast({ title: 'Service charge generated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not generate charge', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate service charge</DialogTitle>
          <DialogDescription>The charge amount is computed by the server from the definition and cannot be edited.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Definition</Label>
            <Controller
              control={control}
              name="serviceChargeDefinitionId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a definition" />
                  </SelectTrigger>
                  <SelectContent>
                    {(definitions ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} · {d.facilityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.serviceChargeDefinitionId && <p className="text-xs text-destructive">{errors.serviceChargeDefinitionId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Lease</Label>
            <Controller
              control={control}
              name="leaseId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {(leases?.items ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.leaseNumber} · {l.rentalTenantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leaseId && <p className="text-xs text-destructive">{errors.leaseId.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodStart">Period start</Label>
              <Input id="periodStart" type="date" {...register('periodStart')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="periodEnd">Period end</Label>
              <Input id="periodEnd" type="date" {...register('periodEnd')} />
              {errors.periodEnd && <p className="text-xs text-destructive">{errors.periodEnd.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={generateCharge.isPending}>
              {generateCharge.isPending ? 'Generating…' : 'Generate charge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
