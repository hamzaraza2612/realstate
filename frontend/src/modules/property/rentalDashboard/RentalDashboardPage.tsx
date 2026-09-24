import { AlertTriangle, FileSignature, HandCoins, ReceiptText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { useRentalDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

export function RentalDashboardPage() {
  const { data, isLoading, isError, refetch } = useRentalDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading rental dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the rental dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Rental Dashboard" description="Rent collection, occupancy and upcoming lease expirations." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FileSignature}
          label="Active leases"
          value={data.activeLeases}
          description={`${data.occupiedUnits}/${data.totalUnits} units occupied`}
        />
        <StatCard icon={ReceiptText} label="Collected rent" value={`$${formatCurrency(data.collectedRent)}`} description={`$${formatCurrency(data.rentDue)} due this period`} />
        <StatCard icon={HandCoins} label="Outstanding rent" value={`$${formatCurrency(data.outstandingRent)}`} description="Not yet collected" />
        <StatCard
          icon={AlertTriangle}
          label="Overdue obligations"
          value={data.overdueObligations}
          description="Rent schedule lines past due"
          alert={data.overdueObligations > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming lease expirations</CardTitle>
            <CardDescription>Active leases ending soon.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingExpirations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leases expiring soon.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lease #</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>End date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.upcomingExpirations.map((lease) => (
                    <TableRow key={lease.leaseId} className="cursor-pointer" onClick={() => navigate(`/property/leases/${lease.leaseId}`)}>
                      <TableCell className="font-medium">{lease.leaseNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{lease.unitNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{lease.tenantName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(lease.endDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription>The latest rent payments recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Lease #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{p.leaseNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                      <TableCell className="text-right">${formatCurrency(p.amount)}</TableCell>
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
