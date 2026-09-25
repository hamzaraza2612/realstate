import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BillingCycleLabel,
  BillingPaymentStatus,
  BillingPaymentStatusLabel,
  EntitlementType,
  InvoiceStatus,
  InvoiceStatusLabel,
  SubscriptionStatus,
  SubscriptionStatusLabel,
  UsageState,
  UsageStateLabel,
} from '@/types/api'
import { entitlementLabel } from '@/lib/entitlementCatalog'
import { useMyEntitlements, useMyInvoices, useMyPayments, useMySubscription, useMyUsage } from './api'
import { MyInvoiceDetailDialog } from './MyInvoiceDetailDialog'

const subscriptionStatusVariant: Record<SubscriptionStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  [SubscriptionStatus.Trialing]: 'secondary',
  [SubscriptionStatus.Active]: 'success',
  [SubscriptionStatus.PastDue]: 'warning',
  [SubscriptionStatus.Paused]: 'outline',
  [SubscriptionStatus.Cancelled]: 'destructive',
  [SubscriptionStatus.Expired]: 'destructive',
}

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

const usageStateVariant: Record<UsageState, 'success' | 'warning' | 'destructive'> = {
  [UsageState.Normal]: 'success',
  [UsageState.Approaching]: 'warning',
  [UsageState.AtLimit]: 'destructive',
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function BillingPage() {
  const { data: subscription, isLoading: subLoading, isError: subError, refetch: refetchSub } = useMySubscription()
  const { data: usage } = useMyUsage()
  const { data: entitlements } = useMyEntitlements()
  const { data: payments } = useMyPayments()
  const [page, setPage] = useState(1)
  const { data: invoices, isLoading: invLoading, isError: invError, refetch: refetchInv } = useMyInvoices(page)
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null)

  const totalPages = invoices?.meta ? Math.max(1, Math.ceil(invoices.meta.total / invoices.meta.pageSize)) : 1
  const enabledFeatures = (entitlements ?? []).filter((e) => e.type === EntitlementType.Feature && e.enabled)

  return (
    <div>
      <PageHeader title="Subscription & Billing" description="Your organization's plan, usage, invoices and payment history." />

      {subLoading ? (
        <LoadingState label="Loading subscription…" />
      ) : subError ? (
        <ErrorState message="Could not load your subscription." onRetry={() => refetchSub()} />
      ) : subscription ? (
        <Card className="mb-4">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{subscription.planName}</CardTitle>
              <CardDescription>
                {formatCurrency(subscription.priceSnapshot, subscription.currency)} / {BillingCycleLabel[subscription.billingCycle].toLowerCase()}
              </CardDescription>
            </div>
            <Badge variant={subscriptionStatusVariant[subscription.status]}>{SubscriptionStatusLabel[subscription.status]}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Trial period</p>
              <p className="font-medium">
                {subscription.trialStartsAt ? `${formatDate(subscription.trialStartsAt)} – ${formatDate(subscription.trialEndsAt)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Current period</p>
              <p className="font-medium">
                {subscription.currentPeriodStart
                  ? `${formatDate(subscription.currentPeriodStart)} – ${formatDate(subscription.currentPeriodEnd)}`
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4">
          <CardContent className="py-8">
            <EmptyState title="No active subscription" description="Contact your platform administrator to have a plan assigned." />
          </CardContent>
        </Card>
      )}

      {usage && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Users', value: usage.users },
            { label: 'Properties', value: usage.properties },
            { label: 'Projects', value: usage.projects },
            { label: 'Portal users', value: usage.portalUsers },
            { label: 'Active leases', value: usage.activeLeases },
            { label: 'Storage', value: formatBytes(usage.storageBytes) },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="p-4">
                <CardTitle className="text-xl">{item.value}</CardTitle>
                <CardDescription>{item.label}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {usage && usage.metrics.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.metrics.map((m) => (
                  <TableRow key={m.code}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell>{m.current}</TableCell>
                    <TableCell className="text-muted-foreground">{m.limit == null ? 'Unlimited' : m.limit}</TableCell>
                    <TableCell>
                      <Badge variant={usageStateVariant[m.state]}>{UsageStateLabel[m.state]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {enabledFeatures.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Enabled features</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {enabledFeatures.map((f) => (
              <Badge key={f.code} variant="secondary">
                {entitlementLabel(f.code)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invLoading && <LoadingState label="Loading invoices…" />}
          {invError && <ErrorState message="Could not load invoices." onRetry={() => refetchInv()} />}
          {!invLoading && !invError && invoices?.items.length === 0 && (
            <EmptyState title="No invoices yet" description="Invoices will appear here once one is generated for your organization." />
          )}
          {!invLoading && !invError && invoices && invoices.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.items.map((inv) => (
                    <TableRow key={inv.id} className="cursor-pointer" onClick={() => setDetailInvoiceId(inv.id)}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
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
                  Page {page} of {totalPages} · {invoices.meta?.total} invoices
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <MyInvoiceDetailDialog invoiceId={detailInvoiceId} onOpenChange={(open) => !open && setDetailInvoiceId(null)} />
    </div>
  )
}
