import { AlertTriangle, Building2, LayoutGrid, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { UtilityTypeLabel } from '@/types/api'
import { useFacilityDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function FacilityDashboardPage() {
  const { data, isLoading, isError, refetch } = useFacilityDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading facility dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the facility dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Facility Dashboard" description="Occupancy, revenue and open work across all facilities." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Facilities" value={data.totalFacilities} description={`${data.totalSpaces} total spaces`} />
        <StatCard
          icon={LayoutGrid}
          label="Occupancy"
          value={`${data.occupancyRate}%`}
          description={`${data.occupiedSpaces} occupied · ${data.availableSpaces} available`}
        />
        <StatCard icon={Wrench} label="Open maintenance" value={data.openMaintenanceRequests} description="Property-level maintenance requests" alert={data.openMaintenanceRequests > 0} />
        <StatCard icon={Wrench} label="Open service requests" value={data.openServiceRequests} description="Facility-level service requests" alert={data.openServiceRequests > 0} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={AlertTriangle} label="Active tenants / members" value={data.activeTenantsOrMembers} description="Across mall and coworking" />
        <StatCard icon={AlertTriangle} label="Total revenue" value={`$${formatCurrency(data.totalRevenue)}`} description="All facility revenue" />
        <StatCard
          icon={AlertTriangle}
          label="Outstanding receivables"
          value={`$${formatCurrency(data.outstandingReceivables)}`}
          description="Not yet collected"
          alert={data.outstandingReceivables > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Utility consumption</CardTitle>
            <CardDescription>Total consumption and billed amount by utility type.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utilitySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No utility readings recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Consumption</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.utilitySummary.map((u) => (
                    <TableRow key={u.type}>
                      <TableCell className="font-medium">{UtilityTypeLabel[u.type]}</TableCell>
                      <TableCell className="text-right">{u.totalConsumption.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${formatCurrency(u.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming events</CardTitle>
            <CardDescription>Events scheduled across mall facilities.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Starts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.upcomingEvents.map((e) => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate('/facility/mall/events')}>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell className="text-muted-foreground">{e.facilityName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(e.startAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
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
