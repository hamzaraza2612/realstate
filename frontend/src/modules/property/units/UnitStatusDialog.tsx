import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { PropertyUnitStatus, PropertyUnitStatusLabel, type PropertyUnitDto } from '@/types/api'
import { useUpdateUnitStatus } from './api'

const settableStatuses = [PropertyUnitStatus.Available, PropertyUnitStatus.Reserved, PropertyUnitStatus.Maintenance, PropertyUnitStatus.Inactive]

export function UnitStatusDialog({ open, onOpenChange, unit }: { open: boolean; onOpenChange: (open: boolean) => void; unit?: PropertyUnitDto }) {
  const updateStatus = useUpdateUnitStatus()
  const [status, setStatus] = useState<string>('')

  if (!unit) return null

  async function onSubmit() {
    if (!unit || !status) return
    try {
      await updateStatus.mutateAsync({ id: unit.id, status: Number(status) as PropertyUnitStatus })
      toast({ title: 'Unit status updated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not update unit status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setStatus(String(unit.status))
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change unit status</DialogTitle>
          <DialogDescription>
            {unit.unitNumber} · {unit.propertyName}. Occupied status is set automatically by lease activation and termination.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settableStatuses.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {PropertyUnitStatusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={updateStatus.isPending || !status}>
            {updateStatus.isPending ? 'Saving…' : 'Update status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
