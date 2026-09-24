import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { SecurityDepositDto } from '@/types/api'
import { useForfeitSecurityDeposit, useReceiveSecurityDeposit, useRefundSecurityDeposit } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  date: z.string().optional(),
  amount: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export type SecurityDepositAction = 'receive' | 'refund' | 'forfeit'

export function SecurityDepositActionDialog({
  open,
  onOpenChange,
  leaseId,
  deposit,
  action,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaseId: string | undefined
  deposit?: SecurityDepositDto
  action: SecurityDepositAction | null
}) {
  const receiveDeposit = useReceiveSecurityDeposit(leaseId)
  const refundDeposit = useRefundSecurityDeposit(leaseId)
  const forfeitDeposit = useForfeitSecurityDeposit(leaseId)

  const { register, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const outstanding = deposit ? deposit.amount - deposit.refundedAmount : 0

  useEffect(() => {
    if (open) reset({ date: today(), amount: outstanding > 0 ? String(outstanding) : '', notes: '' })
  }, [open, outstanding, reset])

  async function onSubmit(values: FormValues) {
    if (!deposit || !action) return
    try {
      if (action === 'receive') {
        await receiveDeposit.mutateAsync({ id: deposit.id, receivedDate: values.date || today(), notes: values.notes || null })
        toast({ title: 'Security deposit received', variant: 'success' })
      } else if (action === 'refund') {
        await refundDeposit.mutateAsync({
          id: deposit.id,
          amount: Number(values.amount) || 0,
          refundDate: values.date || today(),
          notes: values.notes || null,
        })
        toast({ title: 'Security deposit refunded', variant: 'success' })
      } else {
        await forfeitDeposit.mutateAsync({ id: deposit.id, notes: values.notes || null })
        toast({ title: 'Security deposit forfeited', variant: 'success' })
      }
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not update security deposit', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (!action || !deposit) return null

  const isPending = receiveDeposit.isPending || refundDeposit.isPending || forfeitDeposit.isPending
  const title = action === 'receive' ? 'Receive security deposit' : action === 'refund' ? 'Refund security deposit' : 'Forfeit security deposit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Deposit amount: ${deposit.amount.toLocaleString()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {(action === 'receive' || action === 'refund') && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">{action === 'receive' ? 'Received date' : 'Refund date'}</Label>
              <Input id="date" type="date" {...register('date')} />
            </div>
          )}
          {action === 'refund' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Refund amount (outstanding: ${outstanding.toLocaleString()})</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} variant={action === 'forfeit' ? 'destructive' : 'default'}>
              {isPending ? 'Saving…' : title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
