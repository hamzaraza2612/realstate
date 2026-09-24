import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { ExpenseDto } from '@/types/api'
import { usePayExpense } from './api'

const schema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const today = () => new Date().toISOString().slice(0, 10)

export function PayExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseDto | null
}) {
  const payExpense = usePayExpense()
  const idempotencyKey = useRef<string>('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', paymentDate: today(), referenceNumber: '', notes: '' },
  })

  useEffect(() => {
    if (open && expense) {
      idempotencyKey.current = crypto.randomUUID()
      reset({
        amount: String(Math.max(expense.amount - expense.paidAmount, 0)),
        paymentDate: today(),
        referenceNumber: '',
        notes: '',
      })
    }
  }, [open, expense, reset])

  async function onSubmit(values: FormValues) {
    if (!expense) return
    try {
      const payment = await payExpense.mutateAsync({
        id: expense.id,
        amount: Number(values.amount),
        paymentDate: values.paymentDate,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
        idempotencyKey: idempotencyKey.current,
      })
      toast({ title: `Payment recorded (${payment.receiptNumber})`, variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record payment', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (!expense) return null

  const outstanding = Math.max(expense.amount - expense.paidAmount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {expense.projectName} · Outstanding: ${outstanding.toLocaleString()} of ${expense.amount.toLocaleString()}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="referenceNumber">Reference # (optional)</Label>
            <Input id="referenceNumber" {...register('referenceNumber')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={payExpense.isPending}>
              {payExpense.isPending ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
