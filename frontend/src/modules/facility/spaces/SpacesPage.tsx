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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { SpaceStatus, SpaceStatusLabel, SpaceType, SpaceTypeLabel, type SpaceDto } from '@/types/api'
import { useDeleteSpace, useSpaces } from './api'
import { SpaceFormDialog } from './SpaceFormDialog'
import { SpaceStatusDialog } from './SpaceStatusDialog'

const ALL = 'all'

const statusVariant: Record<SpaceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [SpaceStatus.Available]: 'success',
  [SpaceStatus.Reserved]: 'outline',
  [SpaceStatus.Occupied]: 'default',
  [SpaceStatus.Maintenance]: 'secondary',
  [SpaceStatus.Inactive]: 'destructive',
}

export function SpacesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<SpaceDto | undefined>()
  const [statusSpace, setStatusSpace] = useState<SpaceDto | undefined>()
  const [deleteSpace, setDeleteSpace] = useState<SpaceDto | undefined>()

  const { data: facilities } = useAllFacilities()
  const { data, isLoading, isError, refetch } = useSpaces(page, {
    search: search || undefined,
    facilityId: facilityId === ALL ? undefined : facilityId,
    type: type === ALL ? undefined : (Number(type) as SpaceType),
    status: status === ALL ? undefined : (Number(status) as SpaceStatus),
  })
  const deleteSpaceMutation = useDeleteSpace()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteSpace) return
    try {
      await deleteSpaceMutation.mutateAsync(deleteSpace.id)
      toast({ title: 'Space deleted', variant: 'success' })
      setDeleteSpace(undefined)
    } catch (error) {
      toast({ title: 'Could not delete space', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Spaces"
        description="Rentable or usable spaces belonging to your facilities."
        actions={
          <PermissionGate permission="facility.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New space
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={facilityId}
          onValueChange={(v) => {
            setFacilityId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Facility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All facilities</SelectItem>
            {(facilities ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.code} · {f.name}
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
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.entries(SpaceTypeLabel).map(([value, label]) => (
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
            {Object.entries(SpaceStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading spaces…" />}
      {isError && <ErrorState message="Could not load spaces." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No spaces found" description="Try different filters or add your first space." />}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((space) => (
                <TableRow key={space.id}>
                  <TableCell className="font-medium">
                    {space.buildingBlock ? `${space.buildingBlock} · ` : ''}
                    {space.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{space.facilityName}</TableCell>
                  <TableCell className="text-muted-foreground">{SpaceTypeLabel[space.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{space.areaSize != null ? space.areaSize : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{space.rate != null ? `$${space.rate.toLocaleString()}` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[space.status]}>{SpaceStatusLabel[space.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="facility.manage">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setStatusSpace(space)}>
                          Status
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditSpace(space)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteSpace(space)}>
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
              Page {page} of {totalPages} · {data.meta?.total} spaces
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

      <SpaceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SpaceFormDialog open={!!editSpace} onOpenChange={(open) => !open && setEditSpace(undefined)} space={editSpace} />
      <SpaceStatusDialog open={!!statusSpace} onOpenChange={(open) => !open && setStatusSpace(undefined)} space={statusSpace} />
      <ConfirmDialog
        open={!!deleteSpace}
        onOpenChange={(open) => !open && setDeleteSpace(undefined)}
        title="Delete space"
        description={`"${deleteSpace?.code}" will be permanently removed. This is only possible if it has no desks or rooms.`}
        confirmLabel="Delete"
        destructive
        loading={deleteSpaceMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
