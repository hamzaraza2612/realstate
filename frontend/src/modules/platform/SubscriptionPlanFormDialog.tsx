import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { BillingCycle, BillingCycleLabel, EntitlementType, type SubscriptionPlanDto } from '@/types/api'
import {
  FEATURE_ENTITLEMENT_CODES,
  FEATURE_ENTITLEMENT_LABELS,
  LIMIT_ENTITLEMENT_CODES,
  LIMIT_ENTITLEMENT_LABELS,
} from '@/lib/entitlementCatalog'
import { useCreateSubscriptionPlan, useUpdateSubscriptionPlan } from './api'

interface FormState {
  name: string
  code: string
  description: string
  displayOrder: string
  trialDays: string
  currency: string
  price: string
  setupPrice: string
  billingCycle: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  description: '',
  displayOrder: '0',
  trialDays: '0',
  currency: 'USD',
  price: '0',
  setupPrice: '',
  billingCycle: String(BillingCycle.Monthly),
  isActive: true,
}

export function SubscriptionPlanFormDialog({
  plan,
  onOpenChange,
}: {
  plan: SubscriptionPlanDto | 'new' | null
  onOpenChange: (open: boolean) => void
}) {
  const createPlan = useCreateSubscriptionPlan()
  const updatePlan = useUpdateSubscriptionPlan()
  const isEditing = plan !== null && plan !== 'new'
  const open = plan !== null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [featureValues, setFeatureValues] = useState<Record<string, boolean>>({})
  const [limitValues, setLimitValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setForm({
        name: plan.name,
        code: plan.code,
        description: plan.description ?? '',
        displayOrder: String(plan.displayOrder),
        trialDays: String(plan.trialDays),
        currency: plan.currency,
        price: String(plan.price),
        setupPrice: plan.setupPrice != null ? String(plan.setupPrice) : '',
        billingCycle: String(plan.billingCycle),
        isActive: plan.isActive,
      })
      const features: Record<string, boolean> = {}
      for (const code of FEATURE_ENTITLEMENT_CODES) {
        const existing = plan.entitlements.find((e) => e.code === code && e.type === EntitlementType.Feature)
        features[code] = existing?.boolValue ?? true
      }
      setFeatureValues(features)
      const limits: Record<string, string> = {}
      for (const code of LIMIT_ENTITLEMENT_CODES) {
        const existing = plan.entitlements.find((e) => e.code === code && e.type === EntitlementType.Limit)
        limits[code] = existing?.numericValue != null ? String(existing.numericValue) : ''
      }
      setLimitValues(limits)
    } else if (plan === 'new') {
      setForm(EMPTY_FORM)
      setFeatureValues(Object.fromEntries(FEATURE_ENTITLEMENT_CODES.map((c) => [c, true])))
      setLimitValues(Object.fromEntries(LIMIT_ENTITLEMENT_CODES.map((c) => [c, ''])))
    }
    setError(null)
  }, [plan, isEditing])

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) return setError('Name is required')
    if (!form.code.trim()) return setError('Code is required')
    if (!/^[a-z0-9-]+$/.test(form.code.trim())) return setError('Code must be lowercase letters, numbers, and hyphens only')
    if (!form.currency.trim()) return setError('Currency is required')
    if (Number.isNaN(Number(form.price)) || Number(form.price) < 0) return setError('Price must be 0 or more')

    const entitlements = [
      ...FEATURE_ENTITLEMENT_CODES.map((code) => ({ code, boolValue: featureValues[code] ?? true, numericValue: null })),
      ...LIMIT_ENTITLEMENT_CODES.filter((code) => limitValues[code]?.trim()).map((code) => ({
        code,
        boolValue: null,
        numericValue: Number(limitValues[code]),
      })),
    ]

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      displayOrder: Number(form.displayOrder) || 0,
      trialDays: Number(form.trialDays) || 0,
      currency: form.currency.trim().toUpperCase(),
      price: Number(form.price),
      setupPrice: form.setupPrice.trim() ? Number(form.setupPrice) : null,
      billingCycle: Number(form.billingCycle),
      metadataJson: null,
      entitlements,
    }

    try {
      if (isEditing) {
        await updatePlan.mutateAsync({ id: plan.id, payload: { ...payload, isActive: form.isActive } })
      } else {
        await createPlan.mutateAsync(payload)
      }
      toast({ title: isEditing ? 'Plan updated' : 'Plan created', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Could not save plan', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const isPending = createPlan.isPending || updatePlan.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${plan.name}` : 'Create subscription plan'}</DialogTitle>
          <DialogDescription>Define pricing, trial terms and the entitlements this plan grants.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-code">Code</Label>
              <Input
                id="plan-code"
                placeholder="starter"
                value={form.code}
                disabled={isEditing}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-currency">Currency</Label>
              <Input
                id="plan-currency"
                placeholder="USD"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-price">Price</Label>
              <Input id="plan-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-setup-price">Setup price</Label>
              <Input
                id="plan-setup-price"
                type="number"
                step="0.01"
                placeholder="None"
                value={form.setupPrice}
                onChange={(e) => setForm((f) => ({ ...f, setupPrice: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-trial-days">Trial days</Label>
              <Input
                id="plan-trial-days"
                type="number"
                value={form.trialDays}
                onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Billing cycle</Label>
              <Select value={form.billingCycle} onValueChange={(v) => setForm((f) => ({ ...f, billingCycle: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BillingCycleLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-display-order">Display order</Label>
              <Input
                id="plan-display-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
              />
            </div>
            {isEditing && (
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked === true }))} />
                  Active
                </label>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium">Feature entitlements</p>
            <div className="grid grid-cols-1 gap-1.5 rounded-md border p-3 sm:grid-cols-2">
              {FEATURE_ENTITLEMENT_CODES.map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={featureValues[code] ?? true}
                    onCheckedChange={(checked) => setFeatureValues((v) => ({ ...v, [code]: checked === true }))}
                  />
                  {FEATURE_ENTITLEMENT_LABELS[code]}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Limit entitlements</p>
            <p className="mb-2 text-xs text-muted-foreground">Leave blank for unlimited.</p>
            <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2">
              {LIMIT_ENTITLEMENT_CODES.map((code) => (
                <div key={code} className="flex flex-col gap-1.5">
                  <Label htmlFor={`limit-${code}`}>{LIMIT_ENTITLEMENT_LABELS[code]}</Label>
                  <Input
                    id={`limit-${code}`}
                    type="number"
                    placeholder="Unlimited"
                    value={limitValues[code] ?? ''}
                    onChange={(e) => setLimitValues((v) => ({ ...v, [code]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
