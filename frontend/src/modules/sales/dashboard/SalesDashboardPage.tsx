import { AlertTriangle, CircleDollarSign, ClipboardCheck, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { BookingStatusLabel } from '@/types/api'
import { useSalesDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function SalesDashboardPage() {
  const { data, isLoading, isError, refetch } = useSalesDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading sales dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the sales dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Sales Dashboard" description="Booking pipeline, inventory status and collections at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label="Total bookings"
          value={data.totalBookings}
          description={`${data.confirmedBookings} confirmed · ${data.pendingApprovalBookings} pending approval`}
        />
        <StatCard icon={Home} label="Inventory" value={data.availableInventory} description={`${data.reservedOrBookedInventory} reserved/booked · ${data.soldInventory} sold`} />
        <StatCard icon={CircleDollarSign} label="Total booking value" value={`$${formatCurrency(data.totalBookingValue)}`} description={`$${formatCurrency(data.collectedAmount)} collected`} />
        <StatCard
          icon={AlertTriangle}
          label="Outstanding"
          value={`$${formatCurrency(data.outstandingAmount)}`}
          description={`${data.overdueInstallments} overdue installments`}
          alert={data.overdueInstallments > 0}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
          <CardDescription>The latest bookings created across your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project / Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Net price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentBookings.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => navigate(`/sales/bookings/${b.id}`)}>
                    <TableCell className="font-medium">{b.bookingNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{b.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.projectName} · {b.inventoryUnitCode}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{BookingStatusLabel[b.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">${formatCurrency(b.netPrice)}</TableCell>
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
