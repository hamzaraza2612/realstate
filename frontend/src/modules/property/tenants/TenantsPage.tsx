import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import type { RentalTenantDto } from '@/types/api'
import { useDeleteTenant, useTenants } from './api'
import { TenantFormDialog } from './TenantFormDialog'

const ALL = 'all'

export function TenantsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTenant, setEditTenant] = useState<RentalTenantDto | undefined>()
  const [deleteTenant, setDeleteTenant] = useState<RentalTenantDto | undefined>()

  const { data, isLoading, isError, refetch } = useTenants(page, {
    search: search || undefined,
    isActive: activeFilter === ALL ? undefined : activeFilter === 'true',
  })
  const deleteTenantMutation = useDeleteTenant()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteTenant) return
    try {
      await deleteTenantMutation.mutateAsync(deleteTenant.id)
      toast({ title: 'Tenant deleted', variant: 'success' })
      setDeleteTenant(undefined)
    } catch (error) {
      toast({ title: 'Could not delete tenant', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Rental tenants linked to CRM customer records."
        actions={
          <PermissionGate permission="property.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New tenant
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tenants</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading tenants…" />}
      {isError && <ErrorState message="Could not load tenants." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No tenants found" description="Try different filters or add your first tenant." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Active leases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">
                    {tenant.customerName}
                    {tenant.isCompany && <span className="ml-2 text-xs text-muted-foreground">(Company)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tenant.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.phone ?? '—'}</TableCell>
                  <TableCell className="text-right">{tenant.activeLeaseCount}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.isActive ? 'success' : 'secondary'}>{tenant.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="property.manage">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditTenant(tenant)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteTenant(tenant)}>
                          Delete
                        </Button>
                      </div>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} tenants
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

      <TenantFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TenantFormDialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(undefined)} tenant={editTenant} />
      <ConfirmDialog
        open={!!deleteTenant}
        onOpenChange={(open) => !open && setDeleteTenant(undefined)}
        title="Delete tenant"
        description={`"${deleteTenant?.customerName}" will be permanently removed. This is only possible if it has no lease history.`}
        confirmLabel="Delete"
        destructive
        loading={deleteTenantMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
