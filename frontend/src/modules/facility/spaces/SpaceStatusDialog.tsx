import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { SpaceStatus, SpaceStatusLabel, type SpaceDto } from '@/types/api'
import { useUpdateSpaceStatus } from './api'

const settableStatuses = [SpaceStatus.Available, SpaceStatus.Reserved, SpaceStatus.Maintenance, SpaceStatus.Inactive]

export function SpaceStatusDialog({ open, onOpenChange, space }: { open: boolean; onOpenChange: (open: boolean) => void; space?: SpaceDto }) {
  const updateStatus = useUpdateSpaceStatus()
  const [status, setStatus] = useState<string>('')

  if (!space) return null

  async function onSubmit() {
    if (!space || !status) return
    try {
      await updateStatus.mutateAsync({ id: space.id, status: Number(status) as SpaceStatus })
      toast({ title: 'Space status updated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not update space status', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setStatus(String(space.status))
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change space status</DialogTitle>
          <DialogDescription>{space.code} · {space.facilityName}. Occupied status is set automatically and cannot be chosen manually.</DialogDescription>
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
                  {SpaceStatusLabel[s]}
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
