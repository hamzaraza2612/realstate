import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { DateRangeFilter } from '@/modules/reports/components/DateRangeFilter'
import { exportReportCsv } from '@/modules/reports/exportCsv'
import { money } from '@/modules/reports/format'
import { PurchaseOrderStatusLabel } from '@/types/api'
import { usePurchaseOrderExposure, usePurchaseOrderStatusReport, useReceivedVsOrdered, useVendorSpend } from './api'

export function ProcurementReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [purchaseOrderId, setPurchaseOrderId] = useState('')

  return (
    <div>
      <PageHeader title="Procurement Reports" description="Vendor exposure, spend, order status and received-vs-ordered quantities." />

      <Tabs defaultValue="exposure">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="exposure">PO Exposure</TabsTrigger>
          <TabsTrigger value="received-vs-ordered">Received vs Ordered</TabsTrigger>
          <TabsTrigger value="vendor-spend">Vendor Spend</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="exposure">
          <PoExposureTab />
        </TabsContent>
        <TabsContent value="received-vs-ordered">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="po-id">Purchase Order ID</Label>
              <Input
                id="po-id"
                className="w-80"
                placeholder="Paste a purchase order id…"
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
              />
            </div>
          </div>
          <ReceivedVsOrderedTab purchaseOrderId={purchaseOrderId || undefined} />
        </TabsContent>
        <TabsContent value="vendor-spend">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} idPrefix="proc-spend" />
          </div>
          <VendorSpendTab filters={{ from: from || undefined, to: to || undefined }} />
        </TabsContent>
        <TabsContent value="status">
          <StatusTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PoExposureTab() {
  const { data, isLoading, isError, refetch } = usePurchaseOrderExposure()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Purchase order exposure by vendor</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/procurement/purchase-order-exposure', undefined, 'po-exposure.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No open purchase orders" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Order count</TableHead>
                <TableHead>Total exposure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell className="font-medium">{row.vendorName}</TableCell>
                  <TableCell>{row.orderCount}</TableCell>
                  <TableCell>{money(row.totalExposure)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function ReceivedVsOrderedTab({ purchaseOrderId }: { purchaseOrderId?: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useReceivedVsOrdered(purchaseOrderId)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Received vs ordered</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReportCsv('/reports/procurement/received-vs-ordered', { purchaseOrderId }, 'received-vs-ordered.csv')}
        >
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <EmptyState title="No lines to show" description="Enter a purchase order id above, or leave it blank to see every line." />
        )}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={`${row.purchaseOrderId}-${i}`}
                  className="cursor-pointer"
                  onClick={() => navigate(`/procurement/purchase-orders/${row.purchaseOrderId}`)}
                >
                  <TableCell className="font-medium">{row.poNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{row.itemDescription}</TableCell>
                  <TableCell>{row.orderedQuantity}</TableCell>
                  <TableCell>{row.receivedQuantity}</TableCell>
                  <TableCell>{row.outstandingQuantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function VendorSpendTab({ filters }: { filters: { from?: string; to?: string } }) {
  const { data, isLoading, isError, refetch } = useVendorSpend(filters)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Vendor spend</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportReportCsv('/reports/procurement/vendor-spend', filters, 'vendor-spend.csv')}>
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No orders in range" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Order count</TableHead>
                <TableHead>Total spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.vendorId}>
                  <TableCell className="font-medium">{row.vendorName}</TableCell>
                  <TableCell>{row.orderCount}</TableCell>
                  <TableCell>{money(row.totalSpend)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function StatusTab() {
  const { data, isLoading, isError, refetch } = usePurchaseOrderStatusReport()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase orders by status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <LoadingState label="Loading…" />}
        {isError && <ErrorState message="Could not load this report." onRetry={() => refetch()} />}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && <EmptyState title="No purchase orders found" />}
        {!isLoading && !isError && data && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Total value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.status}>
                  <TableCell>
                    <Badge variant="secondary">{PurchaseOrderStatusLabel[row.status]}</Badge>
                  </TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{money(row.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
