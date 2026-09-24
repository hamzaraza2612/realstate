import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { PaymentMethod, PaymentMethodLabel, type FacilityPaymentSourceType } from '@/types/api'
import { useRecordFacilityPayment } from './api'

const schema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const today = () => new Date().toISOString().slice(0, 10)

export function RecordFacilityPaymentDialog({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  outstandingAmount,
  onRecorded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceType: FacilityPaymentSourceType
  sourceId: string | undefined
  outstandingAmount?: number
  onRecorded?: () => void
}) {
  const recordPayment = useRecordFacilityPayment()
  const idempotencyKey = useRef<string>('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: String(PaymentMethod.Cash), paymentDate: today() },
  })

  useEffect(() => {
    if (open) {
      idempotencyKey.current = crypto.randomUUID()
      reset({
        amount: outstandingAmount != null ? String(outstandingAmount) : '',
        paymentDate: today(),
        method: String(PaymentMethod.Cash),
        referenceNumber: '',
        notes: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceId])

  async function onSubmit(values: FormValues) {
    if (!sourceId) return
    try {
      const payment = await recordPayment.mutateAsync({
        sourceType,
        sourceId,
        amount: Number(values.amount),
        paymentDate: values.paymentDate,
        method: Number(values.method) as PaymentMethod,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
        idempotencyKey: idempotencyKey.current,
      })
      toast({ title: `Payment recorded (${payment.receiptNumber})`, variant: 'success' })
      onOpenChange(false)
      onRecorded?.()
    } catch (error) {
      toast({ title: 'Could not record payment', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (!sourceId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {outstandingAmount != null ? `Outstanding: $${outstandingAmount.toLocaleString()}` : 'Record a payment against this item.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input id="paymentDate" type="date" {...register('paymentDate')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Method</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PaymentMethodLabel).map(([value, label]) => (
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
              <Label htmlFor="referenceNumber">Reference # (optional)</Label>
              <Input id="referenceNumber" {...register('referenceNumber')} />
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
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
