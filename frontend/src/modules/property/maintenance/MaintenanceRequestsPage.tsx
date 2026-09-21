import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useAllProperties } from '@/modules/property/properties/api'
import { MaintenanceCategoryLabel, MaintenancePriority, MaintenancePriorityLabel, MaintenanceStatus, MaintenanceStatusLabel } from '@/types/api'
import { useMaintenanceRequests } from './api'
import { MaintenanceRequestFormDialog } from './MaintenanceRequestFormDialog'

const ALL = 'all'

const statusVariant: Record<MaintenanceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenanceStatus.Open]: 'outline',
  [MaintenanceStatus.Assigned]: 'default',
  [MaintenanceStatus.InProgress]: 'default',
  [MaintenanceStatus.OnHold]: 'secondary',
  [MaintenanceStatus.Resolved]: 'success',
  [MaintenanceStatus.Cancelled]: 'destructive',
}

const priorityVariant: Record<MaintenancePriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [MaintenancePriority.Low]: 'secondary',
  [MaintenancePriority.Medium]: 'outline',
  [MaintenancePriority.High]: 'default',
  [MaintenancePriority.Urgent]: 'destructive',
}

export function MaintenanceRequestsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [propertyId, setPropertyId] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [priority, setPriority] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const { data: properties } = useAllProperties()
  const { data, isLoading, isError, refetch } = useMaintenanceRequests(page, {
    search: search || undefined,
    propertyId: propertyId === ALL ? undefined : propertyId,
    status: status === ALL ? undefined : (Number(status) as MaintenanceStatus),
    priority: priority === ALL ? undefined : (Number(priority) as MaintenancePriority),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Maintenance Requests"
        description="Maintenance issues reported across your properties and units."
        actions={
          <PermissionGate permission="property.maintenance.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New request
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search request #…"
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
          value={priority}
          onValueChange={(v) => {
            setPriority(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {Object.entries(MaintenancePriorityLabel).map(([value, label]) => (
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
            {Object.entries(MaintenanceStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading maintenance requests…" />}
      {isError && <ErrorState message="Could not load maintenance requests." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No maintenance requests found" description="Try different filters or log a new request." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((request) => (
                <TableRow key={request.id} className="cursor-pointer" onClick={() => navigate(`/property/maintenance/${request.id}`)}>
                  <TableCell className="font-medium">{request.requestNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {request.propertyName}
                    {request.unitNumber ? ` · ${request.unitNumber}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{MaintenanceCategoryLabel[request.category]}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[request.priority]}>{MaintenancePriorityLabel[request.priority]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(request.reportedDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{request.assignedToUserName ?? request.assignedVendorName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[request.status]}>{MaintenanceStatusLabel[request.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} requests
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

      <MaintenanceRequestFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
