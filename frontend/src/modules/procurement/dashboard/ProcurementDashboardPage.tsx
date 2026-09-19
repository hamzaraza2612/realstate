import { AlertTriangle, ClipboardList, ShoppingCart, Truck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { PurchaseOrderStatus, PurchaseOrderStatusLabel } from '@/types/api'
import { useProcurementDashboard } from './api'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseOrderStatus.Draft]: 'secondary',
  [PurchaseOrderStatus.PendingApproval]: 'outline',
  [PurchaseOrderStatus.Approved]: 'default',
  [PurchaseOrderStatus.Sent]: 'default',
  [PurchaseOrderStatus.PartiallyReceived]: 'outline',
  [PurchaseOrderStatus.Received]: 'success',
  [PurchaseOrderStatus.Cancelled]: 'destructive',
}

export function ProcurementDashboardPage() {
  const { data, isLoading, isError, refetch } = useProcurementDashboard()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Loading procurement dashboard…" />
  if (isError || !data) return <ErrorState message="Could not load the procurement dashboard." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title="Procurement Dashboard" description="Purchase requests, orders and vendor activity at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="Pending approval"
          value={data.purchaseRequestsPendingApproval}
          description="Purchase requests awaiting approval"
          alert={data.purchaseRequestsPendingApproval > 0}
        />
        <StatCard icon={ShoppingCart} label="Purchase orders" value={data.totalPurchaseOrders} description={`${data.pendingDeliveries} pending deliveries`} />
        <StatCard icon={Truck} label="Partially received" value={data.partiallyReceivedOrders} description="Orders awaiting full delivery" />
        <StatCard icon={Users} label="Active vendors" value={data.activeVendors} description={`$${formatCurrency(data.totalProcurementValue)} total value`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Recent purchase orders
          </CardTitle>
          <CardDescription>The latest purchase orders created across your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentPurchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPurchaseOrders.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{po.vendorName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[po.status]}>{PurchaseOrderStatusLabel[po.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">${formatCurrency(po.total)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
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
