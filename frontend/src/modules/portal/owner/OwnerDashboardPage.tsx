import { AlertTriangle, Building, Percent, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { useI18n } from '@/lib/i18n'
import { money, percent } from '@/modules/reports/format'
import { PortalStatCard } from '../shared/PortalStatCard'
import { useOwnerOverdueRent, useOwnerProperties, useOwnerRentCollected } from './api'

export function OwnerDashboardPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: properties, isLoading, isError, refetch } = useOwnerProperties()
  const { data: rentCollected } = useOwnerRentCollected({})
  const { data: overdue } = useOwnerOverdueRent()

  if (isLoading) return <LoadingState label="Loading your portfolio…" />
  if (isError) return <ErrorState message="Could not load your portfolio." onRetry={() => refetch()} />

  const totalUnits = (properties ?? []).reduce((sum, p) => sum + p.totalUnits, 0)
  const occupiedUnits = (properties ?? []).reduce((sum, p) => sum + p.occupiedUnits, 0)
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
  const totalCollected = (rentCollected ?? []).reduce((sum, r) => sum + r.amountCollected, 0)
  const totalOverdue = (overdue ?? []).reduce((sum, r) => sum + r.outstandingAmount, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Portfolio overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">A summary across all of your properties.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard
          icon={Building}
          label="Properties"
          value={(properties ?? []).length}
          description={t('portal.owner.unitsCount').replace('{count}', String(totalUnits))}
          onClick={() => navigate('/portal/owner/properties')}
        />
        <PortalStatCard
          icon={Percent}
          label="Portfolio occupancy"
          value={percent(occupancyRate)}
          description={t('portal.owner.unitsOccupied').replace('{occupied}', String(occupiedUnits)).replace('{total}', String(totalUnits))}
          onClick={() => navigate('/portal/owner/properties')}
        />
        <PortalStatCard
          icon={Wallet}
          label="Rent collected (period)"
          value={money(totalCollected)}
          onClick={() => navigate('/portal/owner/reports')}
        />
        <PortalStatCard
          icon={AlertTriangle}
          label="Overdue rent"
          value={money(totalOverdue)}
          alert={totalOverdue > 0}
          onClick={() => navigate('/portal/owner/reports')}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your properties</CardTitle>
        </CardHeader>
        <CardContent>
          {(properties?.length ?? 0) === 0 ? (
            <EmptyState title="No properties yet" description={t('portal.owner.noPropertiesDescription')} />
          ) : (
            <div className="flex flex-col divide-y">
              {properties!.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/portal/owner/properties/${p.id}`)}
                  className="flex items-center justify-between gap-2 py-3 text-left text-sm hover:text-primary"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground">{p.code}</p>
                  </div>
                  <span className="text-muted-foreground">
                    {p.occupiedUnits}/{p.totalUnits} occupied · {p.occupancyRate.toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
