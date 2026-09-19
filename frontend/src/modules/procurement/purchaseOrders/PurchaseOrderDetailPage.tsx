import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDate } from '@/lib/utils'
import { PurchaseOrderStatus, PurchaseOrderStatusLabel } from '@/types/api'
import {
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  usePurchaseOrder,
  useReceipts,
  useSendPurchaseOrder,
  useSubmitPurchaseOrder,
} from './api'
import { PurchaseOrderFormDialog } from './PurchaseOrderFormDialog'
import { ReceiptFormDialog } from './ReceiptFormDialog'

const statusVariant: Record<PurchaseOrderStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseOrderStatus.Draft]: 'secondary',
  [PurchaseOrderStatus.PendingApproval]: 'outline',
  [PurchaseOrderStatus.Approved]: 'default',
  [PurchaseOrderStatus.Sent]: 'default',
  [PurchaseOrderStatus.PartiallyReceived]: 'outline',
  [PurchaseOrderStatus.Received]: 'success',
  [PurchaseOrderStatus.Cancelled]: 'destructive',
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, refetch } = usePurchaseOrder(id)
  const { data: receipts } = useReceipts(id)
  const submitOrder = useSubmitPurchaseOrder()
  const approveOrder = useApprovePurchaseOrder()
  const sendOrder = useSendPurchaseOrder()
  const cancelOrder = useCancelPurchaseOrder()
  const [editOpen, setEditOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  async function handleAction(action: () => Promise<unknown>, successTitle: string, failTitle: string) {
    try {
      await action()
      toast({ title: successTitle, variant: 'success' })
    } catch (error) {
      toast({ title: failTitle, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading purchase order…" />
  if (isError || !order) return <ErrorState message="Could not load this purchase order." onRetry={() => refetch()} />

  const isDraft = order.status === PurchaseOrderStatus.Draft
  const isPendingApproval = order.status === PurchaseOrderStatus.PendingApproval
  const isApproved = order.status === PurchaseOrderStatus.Approved
  const canReceive = order.status === PurchaseOrderStatus.Sent || order.status === PurchaseOrderStatus.PartiallyReceived
  const canCancel = isDraft || isPendingApproval || isApproved

  return (
    <div>
      <PageHeader
        title={order.poNumber}
        description={`${order.vendorName} · ${order.projectName}${order.workPackageName ? ` · ${order.workPackageName}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <PermissionGate permission="procurement.order.manage">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button
                  onClick={() => handleAction(() => submitOrder.mutateAsync(order.id), 'Purchase order submitted', 'Could not submit order')}
                  disabled={submitOrder.isPending}
                >
                  Submit for approval
                </Button>
              </PermissionGate>
            )}
            {isPendingApproval && (
              <PermissionGate permission="procurement.order.approve">
                <Button
                  onClick={() => handleAction(() => approveOrder.mutateAsync(order.id), 'Purchase order approved', 'Could not approve order')}
                  disabled={approveOrder.isPending}
                >
                  Approve
                </Button>
              </PermissionGate>
            )}
            {isApproved && (
              <PermissionGate permission="procurement.order.manage">
                <Button onClick={() => handleAction(() => sendOrder.mutateAsync(order.id), 'Purchase order sent to vendor', 'Could not send order')} disabled={sendOrder.isPending}>
                  Send to vendor
                </Button>
              </PermissionGate>
            )}
            {canReceive && (
              <PermissionGate permission="procurement.order.manage">
                <Button onClick={() => setReceiptOpen(true)}>Record delivery</Button>
              </PermissionGate>
            )}
            {canCancel && (
              <PermissionGate permission="procurement.order.manage">
                <Button
                  variant="destructive"
                  onClick={() => handleAction(() => cancelOrder.mutateAsync(order.id), 'Purchase order cancelled', 'Could not cancel order')}
                  disabled={cancelOrder.isPending}
                >
                  Cancel
                </Button>
              </PermissionGate>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Field label="Status">
              <Badge variant={statusVariant[order.status]}>{PurchaseOrderStatusLabel[order.status]}</Badge>
            </Field>
            <Field label="Order date">{formatDate(order.orderDate)}</Field>
            <Field label="Expected delivery">{order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '—'}</Field>
            <Field label="Purchase request">{order.purchaseRequestNumber ?? '—'}</Field>
            <Field label="Subtotal">${order.subtotal.toLocaleString()}</Field>
            <Field label="Discount">${order.discount.toLocaleString()}</Field>
            <Field label="Tax">${order.taxAmount.toLocaleString()}</Field>
            <Field label="Total">${order.total.toLocaleString()}</Field>
            {order.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.itemDescription}</TableCell>
                    <TableCell className="text-muted-foreground">{line.unitOfMeasure}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{line.receivedQuantity}</TableCell>
                    <TableCell className="text-right">${line.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${line.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-medium">${order.total.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            {(receipts?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Received by</TableHead>
                    <TableHead>Lines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts!.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.receiptNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.receivedDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.receivedByUserName ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.lines.map((l) => `${l.itemDescription} (${l.receivedQuantity})`).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PurchaseOrderFormDialog open={editOpen} onOpenChange={setEditOpen} purchaseOrder={order} />
      <ReceiptFormDialog open={receiptOpen} onOpenChange={setReceiptOpen} purchaseOrder={order} />
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
