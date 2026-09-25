import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/common/StateViews'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BillingPaymentStatus, BillingPaymentStatusLabel, InvoiceStatus, InvoiceStatusLabel } from '@/types/api'
import { useInvoicePayments, usePlatformInvoice } from './api'
import { RecordPaymentDialog } from './RecordPaymentDialog'

const invoiceStatusVariant: Record<InvoiceStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  [InvoiceStatus.Draft]: 'secondary',
  [InvoiceStatus.Issued]: 'outline',
  [InvoiceStatus.Paid]: 'success',
  [InvoiceStatus.Void]: 'outline',
  [InvoiceStatus.Overdue]: 'destructive',
}

const paymentStatusVariant: Record<BillingPaymentStatus, 'success' | 'secondary' | 'destructive' | 'warning'> = {
  [BillingPaymentStatus.Pending]: 'secondary',
  [BillingPaymentStatus.Succeeded]: 'success',
  [BillingPaymentStatus.Failed]: 'destructive',
  [BillingPaymentStatus.Refunded]: 'warning',
}

export function InvoiceDetailDialog({ invoiceId, onOpenChange }: { invoiceId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: invoice, isLoading } = usePlatformInvoice(invoiceId ?? undefined)
  const { data: payments } = useInvoicePayments(invoiceId ?? undefined)
  const [recording, setRecording] = useState(false)

  return (
    <>
      <Dialog open={invoiceId !== null} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}</DialogTitle>
            <DialogDescription>{invoice?.tenantName}</DialogDescription>
          </DialogHeader>

          {isLoading || !invoice ? (
            <LoadingState label="Loading invoice…" />
          ) : (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={invoiceStatusVariant[invoice.status]}>{InvoiceStatusLabel[invoice.status]}</Badge>
                <div className="text-sm text-muted-foreground">
                  {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Issued</p>
                  <p className="font-medium">{formatDate(invoice.issuedDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-medium">{formatDate(invoice.paidDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(invoice.total, invoice.currency)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((li) => (
                    <TableRow key={li.id}>
                      <TableCell>{li.description}</TableCell>
                      <TableCell>{li.quantity}</TableCell>
                      <TableCell>{formatCurrency(li.unitPrice, invoice.currency)}</TableCell>
                      <TableCell>{formatCurrency(li.amount, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col items-end gap-1 text-sm">
                <span>Subtotal: {formatCurrency(invoice.subtotal, invoice.currency)}</span>
                <span>Tax: {formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                <span className="font-semibold">Total: {formatCurrency(invoice.total, invoice.currency)}</span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Payment history</p>
                  <Button variant="outline" size="sm" onClick={() => setRecording(true)}>
                    Record payment
                  </Button>
                </div>
                {!payments || payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-muted-foreground">{formatDate(p.paymentDate)}</TableCell>
                          <TableCell>{formatCurrency(p.amount, p.currency)}</TableCell>
                          <TableCell>
                            <Badge variant={paymentStatusVariant[p.status]}>{BillingPaymentStatusLabel[p.status]}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{p.providerTransactionId ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog invoice={recording ? (invoice ?? null) : null} onOpenChange={(open) => !open && setRecording(false)} />
    </>
  )
}
