import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { PurchaseOrderStatus, PurchaseOrderStatusLabel } from '@/types/api'
import { useVendorPurchaseOrders } from './api'

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseOrderStatus.Draft]: 'secondary',
  [PurchaseOrderStatus.PendingApproval]: 'outline',
  [PurchaseOrderStatus.Approved]: 'default',
  [PurchaseOrderStatus.Sent]: 'default',
  [PurchaseOrderStatus.PartiallyReceived]: 'default',
  [PurchaseOrderStatus.Received]: 'success',
  [PurchaseOrderStatus.Cancelled]: 'destructive',
}

export function VendorPurchaseOrdersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useVendorPurchaseOrders(page)
  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Purchase Orders" description="Orders placed with you." />

      {isLoading && <LoadingState label="Loading purchase orders…" />}
      {isError && <ErrorState message="Could not load purchase orders." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && <EmptyState title="No purchase orders yet" />}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Order date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((po) => (
                <TableRow key={po.id} className="cursor-pointer" onClick={() => navigate(`/portal/vendor/purchase-orders/${po.id}`)}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{po.projectName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[po.status]}>{PurchaseOrderStatusLabel[po.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">${po.total.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(po.orderDate)}</TableCell>
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
    </div>
  )
}
