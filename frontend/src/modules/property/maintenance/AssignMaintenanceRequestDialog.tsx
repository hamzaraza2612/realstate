import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useAllVendors } from '@/modules/procurement/vendors/api'
import { useUsers } from '@/modules/users/api'
import type { MaintenanceRequestDto } from '@/types/api'
import { useAssignMaintenanceRequest } from './api'

const NONE = 'none'

export function AssignMaintenanceRequestDialog({
  open,
  onOpenChange,
  request,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  request?: MaintenanceRequestDto
}) {
  const assignRequest = useAssignMaintenanceRequest()
  const { data: users } = useUsers(1, '')
  const { data: vendors } = useAllVendors()
  const [assignedToUserId, setAssignedToUserId] = useState(NONE)
  const [assignedVendorId, setAssignedVendorId] = useState(NONE)

  useEffect(() => {
    if (open && request) {
      setAssignedToUserId(request.assignedToUserId ?? NONE)
      setAssignedVendorId(request.assignedVendorId ?? NONE)
    }
  }, [open, request])

  if (!request) return null

  async function onSubmit() {
    if (!request) return
    try {
      await assignRequest.mutateAsync({
        id: request.id,
        payload: {
          assignedToUserId: assignedToUserId !== NONE ? assignedToUserId : null,
          assignedVendorId: assignedVendorId !== NONE ? assignedVendorId : null,
        },
      })
      toast({ title: 'Maintenance request assigned', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not assign request', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign request</DialogTitle>
          <DialogDescription>Assign this request to an internal user and/or a vendor.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Internal user</Label>
            <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {(users?.items ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vendor</Label>
            <Select value={assignedVendorId} onValueChange={setAssignedVendorId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {(vendors ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={assignRequest.isPending}>
            {assignRequest.isPending ? 'Saving…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
