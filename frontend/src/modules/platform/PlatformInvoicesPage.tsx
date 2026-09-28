import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatus, InvoiceStatusLabel } from '@/types/api'
import { usePlatformInvoices, usePlatformOrganizations } from './api'
import { GenerateInvoiceDialog } from './GenerateInvoiceDialog'
import { InvoiceDetailDialog } from './InvoiceDetailDialog'

const invoiceStatusVariant: Record<InvoiceStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  [InvoiceStatus.Draft]: 'secondary',
  [InvoiceStatus.Issued]: 'outline',
  [InvoiceStatus.Paid]: 'success',
  [InvoiceStatus.Void]: 'outline',
  [InvoiceStatus.Overdue]: 'destructive',
}

const FILTER_ALL = 'all'

export function PlatformInvoicesPage() {
  const [page, setPage] = useState(1)
  const [tenantId, setTenantId] = useState(FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null)

  const { data: orgs } = usePlatformOrganizations(1, '', 500)
  const { data, isLoading, isError, refetch } = usePlatformInvoices(page, {
    tenantId: tenantId === FILTER_ALL ? undefined : tenantId,
    status: statusFilter === FILTER_ALL ? undefined : (Number(statusFilter) as InvoiceStatus),
  })

  const totalPages = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize)) : 1

  return (
    <div>
      <PageHeader
        title="Billing / Invoices"
        description="Generated invoices across every tenant. Invoice generation is always an explicit admin action."
        actions={
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" /> Generate invoice
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={tenantId}
          onValueChange={(v) => {
            setTenantId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All tenants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All tenants</SelectItem>
            {(orgs?.items ?? []).map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
            {Object.entries(InvoiceStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading invoices…" />}
      {isError && <ErrorState message="Could not load invoices." onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.items.length === 0 && (
        <EmptyState title="No invoices found" description="Generate one from an active subscription to get started." />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => setDetailInvoiceId(inv.id)}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.tenantName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </TableCell>
                  <TableCell>{formatCurrency(inv.total, inv.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={invoiceStatusVariant[inv.status]}>{InvoiceStatusLabel[inv.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {data.meta?.total} invoices
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

      <GenerateInvoiceDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <InvoiceDetailDialog invoiceId={detailInvoiceId} onOpenChange={(open) => !open && setDetailInvoiceId(null)} />
    </div>
  )
}
