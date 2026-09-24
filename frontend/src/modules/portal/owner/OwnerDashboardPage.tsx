import { AlertTriangle, Building, Percent, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { useOwnerOverdueRent, useOwnerProperties, useOwnerRentCollected } from './api'

export function OwnerDashboardPage() {
  const navigate = useNavigate()
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
        <SummaryCard icon={Building} label="Properties" value={String((properties ?? []).length)} onClick={() => navigate('/portal/owner/properties')} />
        <SummaryCard icon={Percent} label="Portfolio occupancy" value={`${occupancyRate.toFixed(1)}%`} onClick={() => navigate('/portal/owner/properties')} />
        <SummaryCard icon={Wallet} label="Rent collected (period)" value={`$${totalCollected.toLocaleString()}`} onClick={() => navigate('/portal/owner/reports')} />
        <SummaryCard icon={AlertTriangle} label="Overdue rent" value={`$${totalOverdue.toLocaleString()}`} onClick={() => navigate('/portal/owner/reports')} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your properties</CardTitle>
        </CardHeader>
        <CardContent>
          {(properties?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No properties yet.</p>
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-semibold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
