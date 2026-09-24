import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { LeaseStatusLabel, SpaceStatus, SpaceStatusLabel } from '@/types/api'
import { useMallShop } from './api'
import { MallShopFormDialog } from './MallShopFormDialog'

const statusVariant: Record<SpaceStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [SpaceStatus.Available]: 'success',
  [SpaceStatus.Reserved]: 'outline',
  [SpaceStatus.Occupied]: 'default',
  [SpaceStatus.Maintenance]: 'secondary',
  [SpaceStatus.Inactive]: 'destructive',
}

export function MallShopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: shop, isLoading, isError, refetch } = useMallShop(id)
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <LoadingState label="Loading mall shop…" />
  if (isError || !shop) return <ErrorState message="Could not load this mall shop." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title={shop.code}
        description={shop.facilityName}
        actions={
          <PermissionGate permission="facility.mall.manage">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shop details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[shop.status]}>{SpaceStatusLabel[shop.status]}</Badge>
            </Field>
            <Field label="Building / block">{shop.buildingBlock ?? '—'}</Field>
            <Field label="Area size">{shop.areaSize != null ? shop.areaSize : '—'}</Field>
            <Field label="Rate">{shop.rate != null ? `$${shop.rate.toLocaleString()}` : '—'}</Field>
            <Field label="Trade category">{shop.tradeCategory ?? '—'}</Field>
            <Field label="Storefront name">{shop.storefrontName ?? '—'}</Field>
            {shop.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{shop.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lease</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {shop.currentLeaseId ? (
              <>
                <Field label="Current tenant">{shop.currentTenantName ?? '—'}</Field>
                <Field label="Lease status">{shop.currentLeaseStatus != null ? LeaseStatusLabel[shop.currentLeaseStatus] : '—'}</Field>
                <Button size="sm" onClick={() => navigate(`/property/leases/${shop.currentLeaseId}`)}>
                  View lease
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">This shop has no active lease.</p>
                <Button size="sm" onClick={() => navigate(`/property/leases?unitId=${shop.propertyUnitId}`)}>
                  Create lease
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <MallShopFormDialog open={editOpen} onOpenChange={setEditOpen} shop={shop} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
