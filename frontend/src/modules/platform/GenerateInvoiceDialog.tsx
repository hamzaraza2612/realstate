import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatCurrency } from '@/lib/utils'
import { SubscriptionStatus } from '@/types/api'
import { useGenerateInvoice, usePlatformSubscriptions } from './api'

interface CustomLineItem {
  description: string
  quantity: string
  unitPrice: string
}

export function GenerateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: subscriptions } = usePlatformSubscriptions()
  const generateInvoice = useGenerateInvoice()

  const [subscriptionId, setSubscriptionId] = useState('')
  const [taxAmount, setTaxAmount] = useState('0')
  const [dueInDays, setDueInDays] = useState('14')
  const [advanced, setAdvanced] = useState(false)
  const [lineItems, setLineItems] = useState<CustomLineItem[]>([{ description: '', quantity: '1', unitPrice: '0' }])

  useEffect(() => {
    if (open) {
      setSubscriptionId('')
      setTaxAmount('0')
      setDueInDays('14')
      setAdvanced(false)
      setLineItems([{ description: '', quantity: '1', unitPrice: '0' }])
    }
  }, [open])

  const billable = (subscriptions ?? []).filter(
    (s) => s.status === SubscriptionStatus.Active || s.status === SubscriptionStatus.Trialing || s.status === SubscriptionStatus.PastDue,
  )

  async function handleSave() {
    if (!subscriptionId) return
    try {
      await generateInvoice.mutateAsync({
        subscriptionId,
        taxAmount: Number(taxAmount) || 0,
        dueInDays: Number(dueInDays) || 0,
        lineItems: advanced
          ? lineItems
              .filter((li) => li.description.trim())
              .map((li) => ({ description: li.description.trim(), quantity: Number(li.quantity) || 0, unitPrice: Number(li.unitPrice) || 0 }))
          : null,
      })
      toast({ title: 'Invoice generated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not generate invoice', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate invoice</DialogTitle>
          <DialogDescription>
            Defaults to a single line at the subscription's snapshotted price. This is always an explicit admin action — nothing bills
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Subscription</Label>
            <Select value={subscriptionId} onValueChange={setSubscriptionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a subscription" />
              </SelectTrigger>
              <SelectContent>
                {billable.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.tenantName} — {s.planName} ({formatCurrency(s.priceSnapshot, s.currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-tax">Tax amount</Label>
              <Input id="invoice-tax" type="number" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-due-days">Due in (days)</Label>
              <Input id="invoice-due-days" type="number" value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={advanced} onCheckedChange={(checked) => setAdvanced(checked === true)} />
            Add custom line items (default: a single subscription line at the snapshotted price)
          </label>

          {advanced && (
            <div className="flex flex-col gap-2">
              {lineItems.map((li, index) => (
                <div key={index} className="flex flex-wrap items-end gap-2">
                  <div className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={li.description}
                      onChange={(e) =>
                        setLineItems((items) => items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)))
                      }
                    />
                  </div>
                  <div className="flex w-20 flex-col gap-1.5">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={li.quantity}
                      onChange={(e) => setLineItems((items) => items.map((it, i) => (i === index ? { ...it, quantity: e.target.value } : it)))}
                    />
                  </div>
                  <div className="flex w-28 flex-col gap-1.5">
                    <Label className="text-xs">Unit price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={li.unitPrice}
                      onChange={(e) => setLineItems((items) => items.map((it, i) => (i === index ? { ...it, unitPrice: e.target.value } : it)))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLineItems((items) => items.filter((_, i) => i !== index))}
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setLineItems((items) => [...items, { description: '', quantity: '1', unitPrice: '0' }])}
              >
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!subscriptionId || generateInvoice.isPending}>
            {generateInvoice.isPending ? 'Generating…' : 'Generate invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
