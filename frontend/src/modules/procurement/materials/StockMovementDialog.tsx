import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { StockMovementType, StockMovementTypeLabel } from '@/types/api'
import { useRecordStockMovement } from './api'

const schema = z.object({
  type: z.string().min(1, 'Required'),
  quantity: z.string().min(1, 'Quantity is required'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function StockMovementDialog({ open, onOpenChange, materialId }: { open: boolean; onOpenChange: (open: boolean) => void; materialId: string }) {
  const recordMovement = useRecordStockMovement()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: String(StockMovementType.Receipt), quantity: '', notes: '' } })

  useEffect(() => {
    if (open) reset({ type: String(StockMovementType.Receipt), quantity: '', notes: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await recordMovement.mutateAsync({
        id: materialId,
        payload: { type: Number(values.type) as StockMovementType, quantity: Number(values.quantity), notes: values.notes || null },
      })
      toast({ title: 'Stock movement recorded', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record movement', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record stock movement</DialogTitle>
          <DialogDescription>Receipts increase stock; issues and negative adjustments decrease it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(StockMovementTypeLabel).map(([value, label]) => (
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
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" step="0.01" {...register('quantity')} />
            <p className="text-xs text-muted-foreground">Use a negative value for an adjustment that reduces quantity.</p>
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordMovement.isPending}>
              {recordMovement.isPending ? 'Saving…' : 'Record movement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
