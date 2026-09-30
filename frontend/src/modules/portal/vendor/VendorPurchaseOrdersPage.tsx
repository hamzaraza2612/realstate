import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Pagination } from '@/components/common/Pagination'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { PurchaseOrderStatusLabel } from '@/types/api'
import { useVendorPurchaseOrders } from './api'

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
                    <StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{moneyExact(po.total)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(po.orderDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={data.meta?.total} itemLabel="orders" onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
