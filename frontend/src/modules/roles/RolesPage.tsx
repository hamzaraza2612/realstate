import { Lock, MoreHorizontal, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { RoleDto } from '@/types/api'
import { useDeleteRole, useRoles } from './api'
import { RoleFormDialog } from './RoleFormDialog'

export function RolesPage() {
  const { data: roles, isLoading, isError, refetch } = useRoles()
  const deleteRole = useDeleteRole()
  const [editing, setEditing] = useState<RoleDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState<RoleDto | null>(null)

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteRole.mutateAsync(deleting.id)
      toast({ title: 'Role deleted', variant: 'success' })
      setDeleting(null)
    } catch (error) {
      toast({ title: 'Could not delete role', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="System roles ship with sensible defaults; create custom roles for your organization's exact needs."
        actions={
          <PermissionGate permission="roles.manage">
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> Create role
            </Button>
          </PermissionGate>
        }
      />

      {isLoading && <LoadingState label="Loading roles…" />}
      {isError && <ErrorState message="Could not load roles." onRetry={() => refetch()} />}

      {!isLoading && !isError && roles && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{role.description ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                </TableCell>
                <TableCell>
                  <PermissionGate permission="roles.manage">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(role)}>
                          {role.isSystem ? 'View permissions' : 'Edit'}
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(role)}>
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RoleFormDialog role={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete role"
        description={`"${deleting?.name}" will be removed. Users holding only this role will lose its permissions.`}
        confirmLabel="Delete"
        destructive
        loading={deleteRole.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
