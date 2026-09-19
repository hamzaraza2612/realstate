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
import type { PurchaseOrderDto } from '@/types/api'
import { useCreateReceipt } from './api'

const today = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  receivedDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
  quantities: z.record(z.string(), z.string()),
})

type FormValues = z.infer<typeof schema>

export function ReceiptFormDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseOrder: PurchaseOrderDto
}) {
  const createReceipt = useCreateReceipt()
  const outstandingLines = purchaseOrder.lines.filter((l) => l.outstandingQuantity > 0)

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { receivedDate: today(), notes: '', quantities: {} },
  })

  useEffect(() => {
    if (open) reset({ receivedDate: today(), notes: '', quantities: {} })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    const lines = outstandingLines
      .map((line) => ({ purchaseOrderLineId: line.id, receivedQuantity: Number(values.quantities[line.id] || 0) }))
      .filter((l) => l.receivedQuantity > 0)

    if (lines.length === 0) {
      toast({ title: 'Enter a received quantity for at least one line', variant: 'destructive' })
      return
    }

    try {
      await createReceipt.mutateAsync({
        purchaseOrderId: purchaseOrder.id,
        payload: { receivedDate: values.receivedDate, notes: values.notes || null, lines },
      })
      toast({ title: 'Receipt recorded', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record receipt', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record delivery</DialogTitle>
          <DialogDescription>Record quantities received against this purchase order's outstanding lines.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="receivedDate">Received date</Label>
            <Input id="receivedDate" type="date" {...register('receivedDate')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Outstanding lines</Label>
            {outstandingLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">All lines have been fully received.</p>
            ) : (
              outstandingLines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_120px] items-center gap-2">
                  <div className="text-sm">
                    <p className="font-medium">{line.itemDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      Outstanding: {line.outstandingQuantity} {line.unitOfMeasure}
                    </p>
                  </div>
                  <Input type="number" step="0.01" placeholder="Qty received" {...register(`quantities.${line.id}` as const)} />
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createReceipt.isPending || outstandingLines.length === 0}>
              {createReceipt.isPending ? 'Saving…' : 'Record receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
