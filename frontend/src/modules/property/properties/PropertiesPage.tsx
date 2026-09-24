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
import { PropertyStatus, PropertyStatusLabel, PropertyType, PropertyTypeLabel, type PropertyDto } from '@/types/api'
import { useDeleteProperty, useProperties } from './api'
import { PropertyFormDialog } from './PropertyFormDialog'

const ALL = 'all'

const statusVariant: Record<PropertyStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PropertyStatus.Active]: 'success',
  [PropertyStatus.Inactive]: 'secondary',
  [PropertyStatus.UnderRenovation]: 'outline',
}

export function PropertiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editProperty, setEditProperty] = useState<PropertyDto | undefined>()
  const [deleteProperty, setDeleteProperty] = useState<PropertyDto | undefined>()

  const { data, isLoading, isError, refetch } = useProperties(page, {
    search: search || undefined,
    type: type === ALL ? undefined : (Number(type) as PropertyType),
    status: status === ALL ? undefined : (Number(status) as PropertyStatus),
  })
  const deletePropertyMutation = useDeleteProperty()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteProperty) return
    try {
      await deletePropertyMutation.mutateAsync(deleteProperty.id)
      toast({ title: 'Property deleted', variant: 'success' })
      setDeleteProperty(undefined)
    } catch (error) {
      toast({ title: 'Could not delete property', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        description="Buildings and properties managed under the Property & Rental module."
        actions={
          <PermissionGate permission="property.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New property
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or code…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(PropertyTypeLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(PropertyStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading properties…" />}
      {isError && <ErrorState message="Could not load properties." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No properties found" description="Try different filters or add your first property." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.code}</TableCell>
                  <TableCell>{property.name}</TableCell>
                  <TableCell className="text-muted-foreground">{PropertyTypeLabel[property.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{property.city ?? '—'}</TableCell>
                  <TableCell className="text-right">{property.unitCount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[property.status]}>{PropertyStatusLabel[property.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="property.manage">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditProperty(property)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteProperty(property)}>
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
              Page {page} of {totalPages} · {data.meta?.total} properties
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

      <PropertyFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PropertyFormDialog open={!!editProperty} onOpenChange={(open) => !open && setEditProperty(undefined)} property={editProperty} />
      <ConfirmDialog
        open={!!deleteProperty}
        onOpenChange={(open) => !open && setDeleteProperty(undefined)}
        title="Delete property"
        description={`"${deleteProperty?.name}" will be permanently removed. This is only possible if it has no units.`}
        confirmLabel="Delete"
        destructive
        loading={deletePropertyMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
