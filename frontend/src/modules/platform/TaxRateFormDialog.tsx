import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { TaxRateDto } from '@/types/api'
import { useCreateTaxRate, useUpdateTaxRate } from './api'

interface FormState {
  rateCode: string
  name: string
  percentage: string
  isInclusive: boolean
  effectiveFrom: string
  effectiveTo: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  rateCode: '',
  name: '',
  percentage: '0',
  isInclusive: false,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  isActive: true,
}

export function TaxRateFormDialog({
  taxProfileId,
  rate,
  onOpenChange,
}: {
  taxProfileId: string | undefined
  rate: TaxRateDto | 'new' | null
  onOpenChange: (open: boolean) => void
}) {
  const createRate = useCreateTaxRate(taxProfileId)
  const updateRate = useUpdateTaxRate(taxProfileId)
  const isEditing = rate !== null && rate !== 'new'
  const open = rate !== null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setForm({
        rateCode: rate.rateCode,
        name: rate.name,
        percentage: String(rate.percentage),
        isInclusive: rate.isInclusive,
        effectiveFrom: rate.effectiveFrom.slice(0, 10),
        effectiveTo: rate.effectiveTo ? rate.effectiveTo.slice(0, 10) : '',
        isActive: rate.isActive,
      })
    } else if (rate === 'new') {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [rate, isEditing])

  async function handleSave() {
    setError(null)
    if (!isEditing && !form.rateCode.trim()) return setError('Rate code is required')
    if (!form.name.trim()) return setError('Name is required')
    if (Number.isNaN(Number(form.percentage)) || Number(form.percentage) < 0) return setError('Percentage must be 0 or more')

    try {
      if (isEditing) {
        await updateRate.mutateAsync({
          rateId: rate.id,
          payload: {
            name: form.name.trim(),
            percentage: Number(form.percentage),
            isInclusive: form.isInclusive,
            effectiveFrom: form.effectiveFrom,
            effectiveTo: form.effectiveTo || null,
            isActive: form.isActive,
          },
        })
      } else {
        await createRate.mutateAsync({
          rateCode: form.rateCode.trim(),
          name: form.name.trim(),
          percentage: Number(form.percentage),
          isInclusive: form.isInclusive,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || null,
        })
      }
      toast({ title: isEditing ? 'Tax rate updated' : 'Tax rate added', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Could not save tax rate', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const isPending = createRate.isPending || updateRate.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${rate.name}` : 'Add tax rate'}</DialogTitle>
          <DialogDescription>Rates are effective-dated — a new rate takes over from its effective-from date.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate-code">Rate code</Label>
              <Input
                id="tax-rate-code"
                placeholder="STANDARD"
                value={form.rateCode}
                disabled={isEditing}
                onChange={(e) => setForm((f) => ({ ...f, rateCode: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate-name">Name</Label>
              <Input id="tax-rate-name" placeholder="Standard Rate" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate-percentage">Percentage</Label>
              <Input
                id="tax-rate-percentage"
                type="number"
                step="0.01"
                value={form.percentage}
                onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.isInclusive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isInclusive: checked === true }))} />
                Tax-inclusive
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate-from">Effective from</Label>
              <Input
                id="tax-rate-from"
                type="date"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-rate-to">Effective to (optional)</Label>
              <Input id="tax-rate-to" type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} />
            </div>
          </div>

          {isEditing && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked === true }))} />
              Active
            </label>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
