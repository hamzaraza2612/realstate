import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import type { UserDto } from '@/types/api'
import { useDeactivateUser, useUsers } from './api'
import { UserFormDialog } from './UserFormDialog'
import { AssignRolesDialog } from './AssignRolesDialog'

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [assignRolesUser, setAssignRolesUser] = useState<UserDto | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<UserDto | null>(null)

  const { data, isLoading, isError, refetch } = useUsers(page, search)
  const deactivate = useDeactivateUser()

  async function handleDeactivate() {
    if (!deactivateUser) return
    try {
      await deactivate.mutateAsync(deactivateUser.id)
      toast({ title: 'User deactivated', variant: 'success' })
      setDeactivateUser(null)
    } catch (error) {
      toast({ title: 'Could not deactivate user', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage staff accounts and their role assignments within your organization."
        actions={
          <PermissionGate permission="users.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {isLoading && <LoadingState label="Loading users…" />}
      {isError && <ErrorState message="Could not load users." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No users found" description="Try a different search or add your first user." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'outline'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.lastLoginAt)}</TableCell>
                  <TableCell>
                    <PermissionGate permission="users.manage">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setAssignRolesUser(user)}>Assign roles</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={!user.isActive}
                            onClick={() => setDeactivateUser(user)}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} users
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AssignRolesDialog user={assignRolesUser} onOpenChange={(open) => !open && setAssignRolesUser(null)} />
      <ConfirmDialog
        open={deactivateUser !== null}
        onOpenChange={(open) => !open && setDeactivateUser(null)}
        title="Deactivate user"
        description={`${deactivateUser?.fullName} will no longer be able to sign in. This can be reversed later.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivate.isPending}
        onConfirm={handleDeactivate}
      />
    </div>
  )
}
