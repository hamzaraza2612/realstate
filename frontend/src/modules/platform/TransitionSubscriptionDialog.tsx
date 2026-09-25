import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { SubscriptionStatusLabel, SubscriptionValidTransitions, type SubscriptionDto } from '@/types/api'
import { useTransitionSubscription } from './api'

/** Shared by the Tenant Detail page and the cross-tenant Subscriptions list — offers only the
 * `SubscriptionStatusRules.CanTransition`-valid next statuses for the subscription's current
 * status (a client-side convenience; the backend remains the real enforcement). */
export function TransitionSubscriptionDialog({
  subscription,
  onOpenChange,
}: {
  subscription: SubscriptionDto | null
  onOpenChange: (open: boolean) => void
}) {
  const transition = useTransitionSubscription()
  const [toStatus, setToStatus] = useState('')
  const [reason, setReason] = useState('')

  const validNextStatuses = subscription ? SubscriptionValidTransitions[subscription.status] : []

  useEffect(() => {
    if (subscription) {
      setToStatus(validNextStatuses[0] != null ? String(validNextStatuses[0]) : '')
      setReason('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription])

  async function handleSave() {
    if (!subscription || toStatus === '') return
    try {
      await transition.mutateAsync({
        id: subscription.id,
        payload: { toStatus: Number(toStatus) as SubscriptionDto['status'], reason: reason.trim() || null },
      })
      toast({ title: 'Subscription status updated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not transition subscription', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={subscription !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transition subscription status</DialogTitle>
          <DialogDescription>
            {subscription && `Currently ${SubscriptionStatusLabel[subscription.status]} for ${subscription.tenantName}.`}
          </DialogDescription>
        </DialogHeader>

        {validNextStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">This subscription is in a terminal state and cannot transition further.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>New status</Label>
              <Select value={toStatus} onValueChange={setToStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validNextStatuses.map((status) => (
                    <SelectItem key={status} value={String(status)}>
                      {SubscriptionStatusLabel[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transition-reason">Reason (optional)</Label>
              <Textarea id="transition-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {validNextStatuses.length > 0 && (
            <Button type="button" onClick={handleSave} disabled={transition.isPending || toStatus === ''}>
              {transition.isPending ? 'Saving…' : 'Confirm transition'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
