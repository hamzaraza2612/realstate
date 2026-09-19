import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { InstallmentFrequency, InstallmentFrequencyLabel, PaymentPlanType, PaymentPlanTypeLabel } from '@/types/api'
import { useCreatePaymentPlan } from './api'

const scheduleEntrySchema = z.object({ dueDate: z.string().min(1), value: z.string().min(1) })

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  bookingAmount: z.string().optional(),
  downPayment: z.string().optional(),
  planType: z.string(),
  frequency: z.string(),
  numberOfInstallments: z.string().optional(),
  gracePeriodDays: z.string().optional(),
  useCustomSchedule: z.boolean(),
  customSchedule: z.array(scheduleEntrySchema),
})

type FormValues = z.infer<typeof schema>

export function PaymentPlanFormDialog({
  open,
  onOpenChange,
  bookingId,
  netPrice,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  netPrice: number
}) {
  const createPlan = useCreatePaymentPlan(bookingId)
  const [error, setError] = useState<string | null>(null)

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
      planType: String(PaymentPlanType.FixedAmount),
      frequency: String(InstallmentFrequency.Monthly),
      numberOfInstallments: '4',
      gracePeriodDays: '0',
      useCustomSchedule: false,
      customSchedule: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'customSchedule' })
  const useCustomSchedule = watch('useCustomSchedule')
  const planType = watch('planType')

  useEffect(() => {
    if (open) {
      reset({
        name: 'Standard Payment Plan',
        bookingAmount: '',
        downPayment: '',
        planType: String(PaymentPlanType.FixedAmount),
        frequency: String(InstallmentFrequency.Monthly),
        numberOfInstallments: '4',
        gracePeriodDays: '0',
        useCustomSchedule: false,
        customSchedule: [],
      })
      setError(null)
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await createPlan.mutateAsync({
        name: values.name,
        bookingAmount: values.bookingAmount ? Number(values.bookingAmount) : 0,
        downPayment: values.downPayment ? Number(values.downPayment) : 0,
        planType: Number(values.planType) as PaymentPlanType,
        frequency: Number(values.frequency) as InstallmentFrequency,
        numberOfInstallments: values.numberOfInstallments ? Number(values.numberOfInstallments) : 1,
        gracePeriodDays: values.gracePeriodDays ? Number(values.gracePeriodDays) : 0,
        customSchedule: values.useCustomSchedule
          ? values.customSchedule.map((e) => ({ dueDate: e.dueDate, value: Number(e.value) }))
          : null,
      })
      toast({ title: 'Payment plan created', variant: 'success' })
      onOpenChange(false)
    } catch (e) {
      setError(extractErrorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure payment plan</DialogTitle>
          <DialogDescription>Net price: ${netPrice.toLocaleString()}. The schedule must reconcile exactly with this amount.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Plan name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bookingAmount">Booking amount</Label>
              <Input id="bookingAmount" type="number" step="0.01" {...register('bookingAmount')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="downPayment">Down payment</Label>
              <Input id="downPayment" type="number" step="0.01" {...register('downPayment')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="useCustomSchedule"
              render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} id="useCustomSchedule" />}
            />
            <Label htmlFor="useCustomSchedule" className="cursor-pointer font-normal">
              Use a custom installment schedule
            </Label>
          </div>

          {!useCustomSchedule && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Frequency</Label>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(InstallmentFrequencyLabel).map(([value, label]) => (
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
                <Label htmlFor="numberOfInstallments"># of installments</Label>
                <Input id="numberOfInstallments" type="number" min={1} {...register('numberOfInstallments')} />
              </div>
            </div>
          )}

          {useCustomSchedule && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Custom installments ({PaymentPlanTypeLabel[Number(planType) as PaymentPlanType]})</Label>
                <Controller
                  control={control}
                  name="planType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PaymentPlanTypeLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input type="date" {...register(`customSchedule.${index}.dueDate` as const)} />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={Number(planType) === PaymentPlanType.Percentage ? '% of remaining' : 'Amount'}
                    {...register(`customSchedule.${index}.value` as const)}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ dueDate: '', value: '' })}>
                <Plus className="h-3.5 w-3.5" /> Add installment
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
            <Input id="gracePeriodDays" type="number" min={0} {...register('gracePeriodDays')} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? 'Creating…' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
