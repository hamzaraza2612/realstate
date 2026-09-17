import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { RoleDto } from '@/types/api'
import { usePermissions, useCreateRole, useUpdateRole } from './api'

export function RoleFormDialog({ role, onOpenChange }: { role: RoleDto | 'new' | null; onOpenChange: (open: boolean) => void }) {
  const { data: permissions } = usePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const isEditing = role !== null && role !== 'new'
  const isReadOnly = isEditing && role.isSystem
  const open = role !== null

  useEffect(() => {
    if (isEditing) {
      setName(role.name)
      setDescription(role.description ?? '')
      setSelected(role.permissions)
    } else if (role === 'new') {
      setName('')
      setDescription('')
      setSelected([])
    }
  }, [role, isEditing])

  const grouped = (permissions ?? []).reduce<Record<string, typeof permissions>>((acc, p) => {
    acc[p.module] ??= []
    acc[p.module]!.push(p)
    return acc
  }, {})

  async function handleSave() {
    try {
      if (isEditing) {
        await updateRole.mutateAsync({ id: role.id, payload: { description: description || null, permissionCodes: selected } })
      } else {
        await createRole.mutateAsync({ name, description: description || null, permissionCodes: selected })
      }
      toast({ title: isEditing ? 'Role updated' : 'Role created', variant: 'success' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Could not save role', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const isPending = createRole.isPending || updateRole.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${role.name}` : 'Create role'}</DialogTitle>
          <DialogDescription>Choose which permissions this role grants across the platform.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isEditing} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isReadOnly} />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-md border p-3">
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{module}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {perms?.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(p.code)}
                      disabled={isReadOnly}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => (checked ? [...prev, p.code] : prev.filter((c) => c !== p.code)))
                      }}
                    />
                    {p.code}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={isPending || (!isEditing && name.trim() === '')}>
              {isPending ? 'Saving…' : 'Save role'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
