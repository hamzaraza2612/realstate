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
import { FacilityOperatingStatus, FacilityOperatingStatusLabel, FacilityType, FacilityTypeLabel, type FacilityDto } from '@/types/api'
import { useDeleteFacility, useFacilities } from './api'
import { FacilityFormDialog } from './FacilityFormDialog'

const ALL = 'all'

const statusVariant: Record<FacilityOperatingStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [FacilityOperatingStatus.Active]: 'success',
  [FacilityOperatingStatus.Inactive]: 'secondary',
  [FacilityOperatingStatus.UnderMaintenance]: 'outline',
}

export function FacilitiesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const [editFacility, setEditFacility] = useState<FacilityDto | undefined>()
  const [deleteFacility, setDeleteFacility] = useState<FacilityDto | undefined>()

  const { data, isLoading, isError, refetch } = useFacilities(page, {
    search: search || undefined,
    type: type === ALL ? undefined : (Number(type) as FacilityType),
    status: status === ALL ? undefined : (Number(status) as FacilityOperatingStatus),
  })
  const deleteFacilityMutation = useDeleteFacility()

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  async function handleDelete() {
    if (!deleteFacility) return
    try {
      await deleteFacilityMutation.mutateAsync(deleteFacility.id)
      toast({ title: 'Facility deleted', variant: 'success' })
      setDeleteFacility(undefined)
    } catch (error) {
      toast({ title: 'Could not delete facility', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Facilities"
        description="Shared facilities — shopping malls, coworking spaces and other multi-tenant buildings."
        actions={
          <PermissionGate permission="facility.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New facility
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
            {Object.entries(FacilityTypeLabel).map(([value, label]) => (
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
            {Object.entries(FacilityOperatingStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading facilities…" />}
      {isError && <ErrorState message="Could not load facilities." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No facilities found" description="Try different filters or add your first facility." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Spaces</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-medium">{facility.code}</TableCell>
                  <TableCell>{facility.name}</TableCell>
                  <TableCell className="text-muted-foreground">{FacilityTypeLabel[facility.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{facility.propertyName}</TableCell>
                  <TableCell className="text-muted-foreground">{facility.city ?? '—'}</TableCell>
                  <TableCell className="text-right">{facility.spaceCount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[facility.status]}>{FacilityOperatingStatusLabel[facility.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate permission="facility.manage">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditFacility(facility)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteFacility(facility)}>
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
              Page {page} of {totalPages} · {data.meta?.total} facilities
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

      <FacilityFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <FacilityFormDialog open={!!editFacility} onOpenChange={(open) => !open && setEditFacility(undefined)} facility={editFacility} />
      <ConfirmDialog
        open={!!deleteFacility}
        onOpenChange={(open) => !open && setDeleteFacility(undefined)}
        title="Delete facility"
        description={`"${deleteFacility?.name}" will be permanently removed. This is only possible if it has no spaces.`}
        confirmLabel="Delete"
        destructive
        loading={deleteFacilityMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
