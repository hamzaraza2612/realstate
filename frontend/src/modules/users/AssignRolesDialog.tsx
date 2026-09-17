import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { useRoles } from '@/modules/roles/api'
import type { UserDto } from '@/types/api'
import { useAssignRoles } from './api'

export function AssignRolesDialog({ user, onOpenChange }: { user: UserDto | null; onOpenChange: (open: boolean) => void }) {
  const { data: roles } = useRoles()
  const assignRoles = useAssignRoles()
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (user) setSelected(user.roles)
  }, [user])

  async function handleSave() {
    if (!user) return
    try {
      await assignRoles.mutateAsync({ id: user.id, roleNames: selected })
      toast({ title: 'Roles updated', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not update roles', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign roles</DialogTitle>
          <DialogDescription>{user?.fullName} — {user?.email}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
          {roles?.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(role.name)}
                onCheckedChange={(checked) => {
                  setSelected((prev) => (checked ? [...prev, role.name] : prev.filter((r) => r !== role.name)))
                }}
              />
              {role.name}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignRoles.isPending || selected.length === 0}>
            {assignRoles.isPending ? 'Saving…' : 'Save roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
