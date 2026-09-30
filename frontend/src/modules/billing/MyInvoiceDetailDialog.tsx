import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatusLabel } from '@/types/api'
import { useMyInvoice } from './api'

export function MyInvoiceDetailDialog({ invoiceId, onOpenChange }: { invoiceId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: invoice, isLoading } = useMyInvoice(invoiceId ?? undefined)

  return (
    <Dialog open={invoiceId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{invoice ? `Invoice ${invoice.invoiceNumber}` : 'Invoice'}</DialogTitle>
          <DialogDescription>
            {invoice && `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !invoice ? (
          <LoadingState label="Loading invoice…" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={invoice.status} labels={InvoiceStatusLabel} />
              <span className="text-sm text-muted-foreground">Due {formatDate(invoice.dueDate)}</span>
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
              <span>
                Tax
                {invoice.taxCode ? ` (${invoice.taxCode} ${invoice.taxPercentage}%${invoice.taxInclusive ? ', inclusive' : ''})` : ''}:{' '}
                {formatCurrency(invoice.taxAmount, invoice.currency)}
              </span>
              <span className="font-semibold">Total: {formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
