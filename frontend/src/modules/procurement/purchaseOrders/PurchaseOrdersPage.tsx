import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { PurchaseOrderStatus, PurchaseOrderStatusLabel } from '@/types/api'
import { usePurchaseOrders } from './api'
import { PurchaseOrderFormDialog } from './PurchaseOrderFormDialog'

const ALL = 'all'

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseOrderStatus.Draft]: 'secondary',
  [PurchaseOrderStatus.PendingApproval]: 'outline',
  [PurchaseOrderStatus.Approved]: 'default',
  [PurchaseOrderStatus.Sent]: 'default',
  [PurchaseOrderStatus.PartiallyReceived]: 'outline',
  [PurchaseOrderStatus.Received]: 'success',
  [PurchaseOrderStatus.Cancelled]: 'destructive',
}

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>(ALL)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, refetch } = usePurchaseOrders(page, {
    status: status === ALL ? undefined : (Number(status) as PurchaseOrderStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Orders placed with vendors, tracked from draft through delivery."
        actions={
          <PermissionGate permission="procurement.order.manage">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New order
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(PurchaseOrderStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading purchase orders…" />}
      {isError && <ErrorState message="Could not load purchase orders." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No purchase orders found" description="Try different filters or create your first order." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Expected delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((po) => (
                <TableRow key={po.id} className="cursor-pointer" onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{po.vendorName}</TableCell>
                  <TableCell className="text-muted-foreground">{po.projectName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[po.status]}>{PurchaseOrderStatusLabel[po.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">${po.total.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(po.orderDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} orders
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

      <PurchaseOrderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
