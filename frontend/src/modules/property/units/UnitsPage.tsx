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
import { useAllProperties } from '@/modules/property/properties/api'
import { PropertyUnitStatus, PropertyUnitStatusLabel, PropertyUnitType, PropertyUnitTypeLabel, type PropertyUnitDto } from '@/types/api'
import { useDeleteUnit, useUnits } from './api'
import { UnitFormDialog } from './UnitFormDialog'
import { UnitStatusDialog } from './UnitStatusDialog'

const ALL = 'all'

const statusVariant: Record<PropertyUnitStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PropertyUnitStatus.Available]: 'success',
  [PropertyUnitStatus.Reserved]: 'outline',
  [PropertyUnitStatus.Occupied]: 'default',
  [PropertyUnitStatus.Maintenance]: 'secondary',
  [PropertyUnitStatus.Inactive]: 'destructive',
}

export function UnitsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [propertyId, setPropertyId] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUnit, setEditUnit] = useState<PropertyUnitDto | undefined>()
  const [statusUnit, setStatusUnit] = useState<PropertyUnitDto | undefined>()
  const [deleteUnit, setDeleteUnit] = useState<PropertyUnitDto | undefined>()

  const { data: properties } = useAllProperties()
  const { data, isLoading, isError, refetch } = useUnits(page, {
    search: search || undefined,
    propertyId: propertyId === ALL ? undefined : propertyId,
    type: type === ALL ? undefined : (Number(type) as PropertyUnitType),
    status: status === ALL ? undefined : (Number(status) as PropertyUnitStatus),
  })
  const deleteUnitMutation = useDeleteUnit()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteUnit) return
    try {
      await deleteUnitMutation.mutateAsync(deleteUnit.id)
      toast({ title: 'Unit deleted', variant: 'success' })
      setDeleteUnit(undefined)
    } catch (error) {
      toast({ title: 'Could not delete unit', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Units"
        description="Rentable units belonging to your properties."
        actions={
          <PermissionGate permission="property.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New unit
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search unit number…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={propertyId}
          onValueChange={(v) => {
            setPropertyId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All properties</SelectItem>
            {(properties ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} · {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(PropertyUnitTypeLabel).map(([value, label]) => (
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(PropertyUnitStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading units…" />}
      {isError && <ErrorState message="Could not load units." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No units found" description="Try different filters or add your first unit." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Market rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">
                    {unit.buildingBlock ? `${unit.buildingBlock} · ` : ''}
                    {unit.unitNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{unit.propertyName}</TableCell>
                  <TableCell className="text-muted-foreground">{PropertyUnitTypeLabel[unit.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.floor ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.areaSize != null ? `${unit.areaSize} ${unit.areaUnit ?? ''}` : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.marketRentRate != null ? `$${unit.marketRentRate.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[unit.status]}>{PropertyUnitStatusLabel[unit.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="property.manage">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setStatusUnit(unit)}>
                          Status
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditUnit(unit)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteUnit(unit)}>
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
              Page {page} of {totalPages} · {data.meta?.total} units
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

      <UnitFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UnitFormDialog open={!!editUnit} onOpenChange={(open) => !open && setEditUnit(undefined)} unit={editUnit} />
      <UnitStatusDialog open={!!statusUnit} onOpenChange={(open) => !open && setStatusUnit(undefined)} unit={statusUnit} />
      <ConfirmDialog
        open={!!deleteUnit}
        onOpenChange={(open) => !open && setDeleteUnit(undefined)}
        title="Delete unit"
        description={`"${deleteUnit?.unitNumber}" will be permanently removed. This is only possible if it has no lease history.`}
        confirmLabel="Delete"
        destructive
        loading={deleteUnitMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
