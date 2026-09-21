import { AlertTriangle, Building2, DoorOpen, Home, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { usePropertyDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function PropertyDashboardPage() {
  const { data, isLoading, isError, refetch } = usePropertyDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading property dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the property dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Property Dashboard" description="Portfolio occupancy, rental income and maintenance at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Properties" value={data.totalProperties} description={`${data.totalUnits} total units`} />
        <StatCard
          icon={DoorOpen}
          label="Occupancy"
          value={`${data.occupancyRate}%`}
          description={`${data.occupiedUnits} occupied · ${data.availableUnits} available`}
        />
        <StatCard
          icon={Home}
          label="Active leases"
          value={data.activeLeases}
          description={`${data.expiringLeases} expiring soon`}
          alert={data.expiringLeases > 0}
        />
        <StatCard
          icon={Wrench}
          label="Open maintenance"
          value={data.openMaintenanceRequests}
          description="Requests awaiting resolution"
          alert={data.openMaintenanceRequests > 0}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={AlertTriangle} label="Monthly rental income" value={`$${formatCurrency(data.monthlyRentalIncome)}`} description="Sum of active lease rents" />
        <StatCard icon={AlertTriangle} label="Outstanding rent" value={`$${formatCurrency(data.outstandingRent)}`} description="Not yet collected" />
        <StatCard
          icon={AlertTriangle}
          label="Overdue rent"
          value={`$${formatCurrency(data.overdueRent)}`}
          description="Past the due date"
          alert={data.overdueRent > 0}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Property performance</CardTitle>
          <CardDescription>Occupancy and rental income by property.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.propertyPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No property performance data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Occupied</TableHead>
                  <TableHead className="text-right">Monthly income</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.propertyPerformance.map((p) => (
                  <TableRow key={p.propertyId} className="cursor-pointer" onClick={() => navigate('/property/properties')}>
                    <TableCell className="font-medium">{p.propertyName}</TableCell>
                    <TableCell className="text-right">{p.totalUnits}</TableCell>
                    <TableCell className="text-right">{p.occupiedUnits}</TableCell>
                    <TableCell className="text-right">${formatCurrency(p.monthlyRentalIncome)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">${formatCurrency(p.outstandingRent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
