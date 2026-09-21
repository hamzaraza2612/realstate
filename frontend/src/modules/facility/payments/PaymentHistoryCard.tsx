import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PermissionGate } from '@/components/common/PermissionGate'
import { formatDate } from '@/lib/utils'
import { PaymentMethodLabel, type FacilityPaymentSourceType } from '@/types/api'
import { usePaymentsBySource } from './api'

export function PaymentHistoryCard({
  sourceType,
  sourceId,
  onRecordPayment,
  canRecord,
}: {
  sourceType: FacilityPaymentSourceType
  sourceId: string | undefined
  onRecordPayment?: () => void
  canRecord?: boolean
}) {
  const { data: payments } = usePaymentsBySource(sourceType, sourceId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payments</CardTitle>
        {canRecord && onRecordPayment && (
          <PermissionGate permission="facility.payment.record">
            <Button size="sm" onClick={onRecordPayment}>
              Record payment
            </Button>
          </PermissionGate>
        )}
      </CardHeader>
      <CardContent>
        {(payments?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Recorded by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.receiptNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{PaymentMethodLabel[p.method]}</TableCell>
                  <TableCell className="text-right">${p.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{p.recordedByUserName ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
