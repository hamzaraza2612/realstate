import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate } from '@/lib/utils'
import { moneyExact } from '@/modules/reports/format'
import { PurchaseOrderStatusLabel } from '@/types/api'
import { useVendorPurchaseOrder } from './api'

export function VendorPurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: po, isLoading, isError, refetch } = useVendorPurchaseOrder(id)

  if (isLoading) return <LoadingState label="Loading purchase order…" />
  if (isError || !po) return <ErrorState message="Could not load this purchase order." onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader title={po.poNumber} description={po.projectName} />

      <Card>
        <CardHeader>
          <CardTitle>Order details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Status">
            <StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />
          </Field>
          <Field label="Order date">{formatDate(po.orderDate)}</Field>
          <Field label="Expected delivery">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</Field>
          <Field label="Subtotal">{moneyExact(po.subtotal)}</Field>
          <Field label="Discount">{moneyExact(po.discount)}</Field>
          <Field label="Tax">{moneyExact(po.taxAmount)}</Field>
          <Field label="Total">{moneyExact(po.total)}</Field>
          {po.notes && (
            <div className="col-span-full">
              <p className="text-muted-foreground">Notes</p>
              <p>{po.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.itemDescription}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unitOfMeasure}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">{moneyExact(line.unitPrice)}</TableCell>
                  <TableCell className="text-right">{moneyExact(line.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{line.receivedQuantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  )
}
