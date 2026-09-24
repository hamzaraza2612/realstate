import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatDate } from '@/lib/utils'
import { PurchaseOrderStatus, PurchaseOrderStatusLabel } from '@/types/api'
import { useVendorPurchaseOrder } from './api'

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseOrderStatus.Draft]: 'secondary',
  [PurchaseOrderStatus.PendingApproval]: 'outline',
  [PurchaseOrderStatus.Approved]: 'default',
  [PurchaseOrderStatus.Sent]: 'default',
  [PurchaseOrderStatus.PartiallyReceived]: 'default',
  [PurchaseOrderStatus.Received]: 'success',
  [PurchaseOrderStatus.Cancelled]: 'destructive',
}

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
            <Badge variant={statusVariant[po.status]}>{PurchaseOrderStatusLabel[po.status]}</Badge>
          </Field>
          <Field label="Order date">{formatDate(po.orderDate)}</Field>
          <Field label="Expected delivery">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '—'}</Field>
          <Field label="Subtotal">${po.subtotal.toLocaleString()}</Field>
          <Field label="Discount">${po.discount.toLocaleString()}</Field>
          <Field label="Tax">${po.taxAmount.toLocaleString()}</Field>
          <Field label="Total">${po.total.toLocaleString()}</Field>
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
                  <TableCell className="text-right">${line.unitPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${line.total.toLocaleString()}</TableCell>
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
