import { List, Map as MapIcon, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CoordinateMapView } from '@/components/common/CoordinateMapView'
import type { MapPoint } from '@/components/common/CoordinateMapView'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useAllProjects } from '@/modules/projects/api'
import { InventoryStatus, InventoryStatusLabel, InventoryUnitType, InventoryUnitTypeLabel } from '@/types/api'
import { useInventory } from './api'
import { InventoryFormDialog } from './InventoryFormDialog'

const statusVariant: Record<InventoryStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [InventoryStatus.Available]: 'success',
  [InventoryStatus.Reserved]: 'outline',
  [InventoryStatus.Booked]: 'default',
  [InventoryStatus.Sold]: 'secondary',
  [InventoryStatus.Blocked]: 'destructive',
  [InventoryStatus.UnderConstruction]: 'outline',
  [InventoryStatus.HandedOver]: 'secondary',
}

const statusDotClass: Record<InventoryStatus, string> = {
  [InventoryStatus.Available]: 'bg-emerald-500',
  [InventoryStatus.Reserved]: 'bg-amber-500',
  [InventoryStatus.Booked]: 'bg-blue-500',
  [InventoryStatus.Sold]: 'bg-slate-500',
  [InventoryStatus.Blocked]: 'bg-red-500',
  [InventoryStatus.UnderConstruction]: 'bg-orange-500',
  [InventoryStatus.HandedOver]: 'bg-violet-500',
}

const ALL = 'all'

export function InventoryPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState<string>(ALL)
  const [type, setType] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: projects } = useAllProjects()
  const { data, isLoading, isError, refetch } = useInventory(
    page,
    {
      search: search || undefined,
      projectId: projectId === ALL ? undefined : projectId,
      type: type === ALL ? undefined : (Number(type) as InventoryUnitType),
      status: status === ALL ? undefined : (Number(status) as InventoryStatus),
    },
    view === 'map' ? 200 : 20,
  )

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  const mapPoints: MapPoint[] = (data?.items ?? [])
    .filter((u) => u.latitude != null && u.longitude != null)
    .map((u) => ({
      id: u.id,
      label: u.code,
      sublabel: `${InventoryStatusLabel[u.status]} · ${u.projectName}`,
      latitude: u.latitude!,
      longitude: u.longitude!,
      colorClassName: statusDotClass[u.status],
    }))

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Plots, apartments, offices, shops and houses across all your projects."
        actions={
          <PermissionGate permission="inventory.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add unit
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code/number…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={projectId}
          onValueChange={(v) => {
            setProjectId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {(projects ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
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
            {Object.entries(InventoryUnitTypeLabel).map(([value, label]) => (
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
            {Object.entries(InventoryStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-1 rounded-md border p-0.5">
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4" /> List
          </Button>
          <Button variant={view === 'map' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('map')}>
            <MapIcon className="h-4 w-4" /> Map
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState label="Loading inventory…" />}
      {isError && <ErrorState message="Could not load inventory." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No inventory found" description="Try different filters or add your first unit." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && view === 'map' && (
        <CoordinateMapView points={mapPoints} onSelect={(id) => navigate(`/inventory/${id}`)} />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && view === 'list' && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((unit) => (
                <TableRow key={unit.id} className="cursor-pointer" onClick={() => navigate(`/inventory/${unit.id}`)}>
                  <TableCell className="font-medium">{unit.code}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.projectName}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.nodePath ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{InventoryUnitTypeLabel[unit.type]}</TableCell>
                  <TableCell className="text-muted-foreground">{unit.areaSize ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[unit.status]}>{InventoryStatusLabel[unit.status]}</Badge>
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

      <InventoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
