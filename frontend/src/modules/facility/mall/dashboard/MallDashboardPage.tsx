import { AlertTriangle, CircleParking, Store } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { useAllFacilities } from '@/modules/facility/facilities/api'
import { FacilityType } from '@/types/api'
import { useMallDashboard } from './api'

const ALL = 'all'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function MallDashboardPage() {
  const [facilityId, setFacilityId] = useState<string>(ALL)
  const { data: facilities } = useAllFacilities(FacilityType.ShoppingMall)
  const { data, isLoading, isError, refetch } = useMallDashboard(facilityId === ALL ? undefined : facilityId)

  return (
    <div>
      <PageHeader
        title="Mall Dashboard"
        description="Shop occupancy, rent collection and mall operations."
        actions={
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All mall facilities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All mall facilities</SelectItem>
              {(facilities ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.code} · {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading && <LoadingState label="Loading mall dashboard…" />}
      {isError && <ErrorState message="Could not load the mall dashboard." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Store} label="Shops" value={data.totalShops} description={`${data.occupiedShops} occupied · ${data.vacantShops} vacant`} />
            <StatCard icon={Store} label="Occupancy" value={`${data.occupancyRate}%`} description={`${data.activeTenants} active tenants`} />
            <StatCard icon={AlertTriangle} label="Rent due" value={`$${formatCurrency(data.rentDue)}`} description={`$${formatCurrency(data.rentCollected)} collected`} />
            <StatCard
              icon={AlertTriangle}
              label="Service charges outstanding"
              value={`$${formatCurrency(data.serviceChargesOutstanding)}`}
              description="Not yet collected"
              alert={data.serviceChargesOutstanding > 0}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={CircleParking} label="Parking occupied" value={`${data.parkingOccupied}/${data.parkingTotal}`} description="Allocated parking spaces" />
            <StatCard icon={AlertTriangle} label="Open maintenance" value={data.openMaintenanceRequests} description="Open maintenance requests" alert={data.openMaintenanceRequests > 0} />
            <StatCard icon={AlertTriangle} label="Upcoming events" value={data.upcomingEvents} description="Scheduled mall events" />
            <StatCard
              icon={AlertTriangle}
              label="Unacknowledged notices"
              value={data.unacknowledgedNotices}
              description="Sent but not acknowledged"
              alert={data.unacknowledgedNotices > 0}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue summary</CardTitle>
              <CardDescription>Total mall revenue for the selected scope.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${formatCurrency(data.revenueSummary)}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  description,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  description: string
  alert?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Icon className={alert ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-primary'} />
        </div>
        <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        <CardDescription>{label}</CardDescription>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
    </Card>
  )
}
