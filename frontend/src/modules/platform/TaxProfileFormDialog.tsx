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
import { useCountries } from '@/modules/settings/api'
import type { TaxProfileDto } from '@/types/api'
import { useCreateTaxProfile, useUpdateTaxProfile } from './api'

interface FormState {
  countryCode: string
  code: string
  name: string
  description: string
  isActive: boolean
}

const EMPTY_FORM: FormState = { countryCode: '', code: '', name: '', description: '', isActive: true }

export function TaxProfileFormDialog({
  profile,
  onOpenChange,
}: {
  profile: TaxProfileDto | 'new' | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: countries } = useCountries()
  const createProfile = useCreateTaxProfile()
  const updateProfile = useUpdateTaxProfile()
  const isEditing = profile !== null && profile !== 'new'
  const open = profile !== null

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setForm({
        countryCode: profile.countryCode,
        code: profile.code,
        name: profile.name,
        description: profile.description ?? '',
        isActive: profile.isActive,
      })
    } else if (profile === 'new') {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [profile, isEditing])

  async function handleSave() {
    setError(null)
    if (!isEditing && !form.countryCode) return setError('Country is required')
    if (!isEditing && !form.code.trim()) return setError('Code is required')
    if (!form.name.trim()) return setError('Name is required')

    try {
      if (isEditing) {
        await updateProfile.mutateAsync({
          id: profile.id,
          payload: { name: form.name.trim(), description: form.description.trim() || null, isActive: form.isActive },
        })
      } else {
        await createProfile.mutateAsync({
          countryCode: form.countryCode,
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
        })
      }
      toast({ title: isEditing ? 'Tax profile updated' : 'Tax profile created', variant: 'success' })
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Could not save tax profile', description: extractErrorMessage(err), variant: 'destructive' })
    }
  }

  const isPending = createProfile.isPending || updateProfile.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${profile.name}` : 'New tax profile'}</DialogTitle>
          <DialogDescription>A country's named set of tax rates (e.g. UAE VAT). Add individual rates afterward.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <Select value={form.countryCode} onValueChange={(v) => setForm((f) => ({ ...f, countryCode: v }))} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {(countries ?? []).map((c) => (
                    <SelectItem key={c.alpha2} value={c.alpha2}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tax-profile-code">Code</Label>
              <Input
                id="tax-profile-code"
                placeholder="AE-VAT"
                value={form.code}
                disabled={isEditing}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-profile-name">Name</Label>
            <Input id="tax-profile-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-profile-description">Description</Label>
            <Textarea
              id="tax-profile-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
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
            {isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
