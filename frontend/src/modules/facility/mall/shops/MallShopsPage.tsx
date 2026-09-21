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
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType, SpaceStatus, SpaceStatusLabel } from '@/types/api'
import { useMallShops } from './api'
import { MallShopFormDialog } from './MallShopFormDialog'

const ALL = 'all'

const statusVariant: Record<SpaceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [SpaceStatus.Available]: 'success',
  [SpaceStatus.Reserved]: 'outline',
  [SpaceStatus.Occupied]: 'default',
  [SpaceStatus.Maintenance]: 'secondary',
  [SpaceStatus.Inactive]: 'destructive',
}

export function MallShopsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()

  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data, isLoading, isError, refetch } = useMallShops(page, {
    search: search || undefined,
    facilityId: facilityId === ALL ? undefined : facilityId,
    status: status === ALL ? undefined : (Number(status) as SpaceStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Mall Shops"
        description="Shops leased out within shopping mall facilities."
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New shop
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shop code…"
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

      {isLoading && <LoadingState label="Loading mall shops…" />}
      {isError && <ErrorState message="Could not load mall shops." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No mall shops found" description="Try different filters or add your first shop." />}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Trade category</TableHead>
                <TableHead>Storefront</TableHead>
                <TableHead>Current tenant</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((shop) => (
                <TableRow key={shop.spaceId} className="cursor-pointer" onClick={() => navigate(`/facility/mall/shops/${shop.spaceId}`)}>
                  <TableCell className="font-medium">
                    {shop.buildingBlock ? `${shop.buildingBlock} · ` : ''}
                    {shop.code}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{shop.facilityName}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.tradeCategory ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.storefrontName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{shop.currentTenantName ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[shop.status]}>{SpaceStatusLabel[shop.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} shops
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

      <MallShopFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
