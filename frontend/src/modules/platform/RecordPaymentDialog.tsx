import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { InvoiceDto } from '@/types/api'
import { useRecordPayment } from './api'

/** `idempotencyKey` is regenerated fresh every time the dialog opens (see docs/SAAS_BILLING.md's
 * `BillingPayment.IdempotencyKey` — unique per (TenantId, IdempotencyKey), so a double-click/retry
 * on the SAME open never double-posts, while a genuinely new payment attempt gets its own key). */
export function RecordPaymentDialog({
  invoice,
  onOpenChange,
}: {
  invoice: InvoiceDto | null
  onOpenChange: (open: boolean) => void
}) {
  const recordPayment = useRecordPayment(invoice?.id)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [providerTransactionId, setProviderTransactionId] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    if (invoice) {
      setAmount(String(invoice.total))
      setPaymentDate(new Date().toISOString().slice(0, 10))
      setProviderTransactionId('')
      setIdempotencyKey(crypto.randomUUID())
    }
  }, [invoice])

  async function handleSave() {
    if (!invoice) return
    try {
      await recordPayment.mutateAsync({
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        providerTransactionId: providerTransactionId.trim() || null,
        idempotencyKey,
      })
      toast({ title: 'Payment recorded', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not record payment', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice && `Against invoice ${invoice.invoiceNumber} for ${invoice.tenantName}. This records a payment already received — it does not charge a card.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input id="payment-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Payment date</Label>
            <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="payment-ref">Provider transaction ID (optional)</Label>
            <Input id="payment-ref" value={providerTransactionId} onChange={(e) => setProviderTransactionId(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={recordPayment.isPending || !amount || !paymentDate}>
            {recordPayment.isPending ? 'Recording…' : 'Record payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
