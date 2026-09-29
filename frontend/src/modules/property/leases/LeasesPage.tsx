import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { useAllProperties } from '@/modules/property/properties/api'
import { moneyExact } from '@/modules/reports/format'
import { LeaseStatus, LeaseStatusLabel } from '@/types/api'
import { useLeases } from './api'
import { LeaseFormDialog } from './LeaseFormDialog'

const ALL = 'all'

export function LeasesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [propertyId, setPropertyId] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const { data: properties } = useAllProperties()
  const { data, isLoading, isError, refetch } = useLeases(page, {
    search: search || undefined,
    propertyId: propertyId === ALL ? undefined : propertyId,
    status: status === ALL ? undefined : (Number(status) as LeaseStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Rental leases from draft through activation, renewal and termination."
        actions={
          <PermissionGate permission="property.lease.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New lease
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lease #…"
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
            {Object.entries(LeaseStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading leases…" />}
      {isError && <ErrorState message="Could not load leases." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState
          title="No leases found"
          description="Try different filters or create your first lease."
          action={
            <PermissionGate permission="property.lease.manage">
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New lease
              </Button>
            </PermissionGate>
          }
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lease #</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((lease) => (
                <TableRow key={lease.id} className="cursor-pointer" onClick={() => navigate(`/property/leases/${lease.id}`)}>
                  <TableCell className="font-medium">{lease.leaseNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {lease.propertyName} · {lease.unitNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lease.rentalTenantName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(lease.startDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(lease.endDate)}</TableCell>
                  <TableCell className="text-right">{moneyExact(lease.rentAmount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={lease.status} labels={LeaseStatusLabel} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="leases" onPageChange={setPage} />
        </>
      )}

      <LeaseFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
