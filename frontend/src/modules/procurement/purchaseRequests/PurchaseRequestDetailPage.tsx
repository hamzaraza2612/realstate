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
import { PurchasePriority, PurchasePriorityLabel, PurchaseRequestStatus, PurchaseRequestStatusLabel } from '@/types/api'
import {
  useApprovePurchaseRequest,
  useCancelPurchaseRequest,
  usePurchaseRequest,
  useRejectPurchaseRequest,
  useSubmitPurchaseRequest,
} from './api'
import { PurchaseRequestFormDialog } from './PurchaseRequestFormDialog'

const statusVariant: Record<PurchaseRequestStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchaseRequestStatus.Draft]: 'secondary',
  [PurchaseRequestStatus.Submitted]: 'outline',
  [PurchaseRequestStatus.Approved]: 'success',
  [PurchaseRequestStatus.Rejected]: 'destructive',
  [PurchaseRequestStatus.Cancelled]: 'destructive',
}

const priorityVariant: Record<PurchasePriority, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  [PurchasePriority.Low]: 'outline',
  [PurchasePriority.Medium]: 'secondary',
  [PurchasePriority.High]: 'destructive',
}

export function PurchaseRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: request, isLoading, isError, refetch } = usePurchaseRequest(id)
  const submitRequest = useSubmitPurchaseRequest()
  const approveRequest = useApprovePurchaseRequest()
  const rejectRequest = useRejectPurchaseRequest()
  const cancelRequest = useCancelPurchaseRequest()
  const [editOpen, setEditOpen] = useState(false)

  async function handleAction(action: () => Promise<unknown>, successTitle: string, failTitle: string) {
    try {
      await action()
      toast({ title: successTitle, variant: 'success' })
    } catch (error) {
      toast({ title: failTitle, description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  if (isLoading) return <LoadingState label="Loading purchase request…" />
  if (isError || !request) return <ErrorState message="Could not load this purchase request." onRetry={() => refetch()} />

  const isDraft = request.status === PurchaseRequestStatus.Draft
  const isSubmitted = request.status === PurchaseRequestStatus.Submitted

  return (
    <div>
      <PageHeader
        title={request.requestNumber}
        description={`${request.projectName}${request.workPackageName ? ` · ${request.workPackageName}` : ''}`}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <PermissionGate permission="procurement.request.create">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction(() => cancelRequest.mutateAsync(request.id), 'Purchase request cancelled', 'Could not cancel request')}
                  disabled={cancelRequest.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAction(() => submitRequest.mutateAsync(request.id), 'Purchase request submitted', 'Could not submit request')}
                  disabled={submitRequest.isPending}
                >
                  Submit for approval
                </Button>
              </PermissionGate>
            )}
            {isSubmitted && (
              <PermissionGate permission="procurement.request.approve">
                <Button
                  variant="destructive"
                  onClick={() => handleAction(() => rejectRequest.mutateAsync(request.id), 'Purchase request rejected', 'Could not reject request')}
                  disabled={rejectRequest.isPending}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction(() => approveRequest.mutateAsync(request.id), 'Purchase request approved', 'Could not approve request')}
                  disabled={approveRequest.isPending}
                >
                  Approve
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
              <Badge variant={statusVariant[request.status]}>{PurchaseRequestStatusLabel[request.status]}</Badge>
            </Field>
            <Field label="Priority">
              <Badge variant={priorityVariant[request.priority]}>{PurchasePriorityLabel[request.priority]}</Badge>
            </Field>
            <Field label="Requested by">{request.requestedByUserName ?? '—'}</Field>
            <Field label="Required by">{request.requiredDate ? formatDate(request.requiredDate) : '—'}</Field>
            {request.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Notes</p>
                <p>{request.notes}</p>
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
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.itemDescription}</TableCell>
                    <TableCell className="text-muted-foreground">{line.unitOfMeasure}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">${line.estimatedUnitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${line.estimatedTotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">
                    Estimated total
                  </TableCell>
                  <TableCell className="text-right font-medium">${request.estimatedTotal.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      <PurchaseRequestFormDialog open={editOpen} onOpenChange={setEditOpen} purchaseRequest={request} />
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
