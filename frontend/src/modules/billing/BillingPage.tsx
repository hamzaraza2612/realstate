import { AlertTriangle, Building2, FileSignature, FolderKanban, HardDrive, Info, UserRound, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useI18n } from '@/lib/i18n'
import { USAGE_STATE_TONE, entitlementLabel } from '@/lib/entitlementCatalog'
import { cn, formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import {
  BillingCycleLabel,
  BillingPaymentStatusLabel,
  EntitlementType,
  InvoiceStatusLabel,
  SubscriptionStatus,
  SubscriptionStatusLabel,
  UsageState,
  UsageStateLabel,
  type SubscriptionDto,
} from '@/types/api'
import { useMyEntitlements, useMyInvoices, useMyPayments, useMySubscription, useMyUsage } from './api'
import { MyInvoiceDetailDialog } from './MyInvoiceDetailDialog'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Whole days from now until `iso` (negative once it has passed). */
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

/** A plain-language sentence explaining what the subscription status means for the business,
 * so a non-technical owner doesn't have to interpret "Past Due" or "Trialing" on their own.
 * Every "what to do" points at the platform administrator — there is no self-service plan
 * change or online payment in this product. */
function useSubscriptionSummary(subscription: SubscriptionDto): { message: string; warn: boolean } {
  const { t } = useI18n()
  const periodEnd = subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : null

  if (subscription.cancelAtPeriodEnd && periodEnd && subscription.status !== SubscriptionStatus.Cancelled) {
    return { message: t('billing.summary.cancelAtPeriodEnd').replace('{date}', periodEnd), warn: true }
  }
  switch (subscription.status) {
    case SubscriptionStatus.Trialing: {
      if (!subscription.trialEndsAt) return { message: t('billing.summary.trialingNoDate'), warn: false }
      const days = daysUntil(subscription.trialEndsAt)
      return {
        message: t('billing.summary.trialing')
          .replace('{date}', formatDate(subscription.trialEndsAt))
          .replace('{days}', String(Math.max(0, days))),
        warn: days <= 7,
      }
    }
    case SubscriptionStatus.Active:
      return {
        message: periodEnd ? t('billing.summary.active').replace('{date}', periodEnd) : t('billing.summary.activeNoDate'),
        warn: false,
      }
    case SubscriptionStatus.PastDue:
      return { message: t('billing.summary.pastDue'), warn: true }
    case SubscriptionStatus.Paused:
      return { message: t('billing.summary.paused'), warn: true }
    case SubscriptionStatus.Cancelled:
      return { message: t('billing.summary.cancelled'), warn: true }
    case SubscriptionStatus.Expired:
      return { message: t('billing.summary.expired'), warn: true }
    default:
      return { message: '', warn: false }
  }
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionDto }) {
  const { t } = useI18n()
  const summary = useSubscriptionSummary(subscription)
  const SummaryIcon = summary.warn ? AlertTriangle : Info

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardDescription>{t('billing.currentPlan')}</CardDescription>
          <CardTitle className="mt-1 text-xl">{subscription.planName}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(subscription.priceSnapshot, subscription.currency)} / {BillingCycleLabel[subscription.billingCycle].toLowerCase()}
          </p>
        </div>
        <StatusBadge status={subscription.status} labels={SubscriptionStatusLabel} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {summary.message && (
          <div
            className={cn(
              'flex items-start gap-2 rounded-md border p-3',
              summary.warn
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                : 'bg-muted/40',
            )}
          >
            <SummaryIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{summary.message}</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{t('billing.trialPeriod')}</p>
            <p className="font-medium">
              {subscription.trialStartsAt ? `${formatDate(subscription.trialStartsAt)} – ${formatDate(subscription.trialEndsAt)}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('billing.currentPeriod')}</p>
            <p className="font-medium">
              {subscription.currentPeriodStart
                ? `${formatDate(subscription.currentPeriodStart)} – ${formatDate(subscription.currentPeriodEnd)}`
                : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BillingPage() {
  const { t } = useI18n()
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
        <SubscriptionCard subscription={subscription} />
      ) : (
        <Card className="mb-4">
          <CardContent className="py-8">
            <EmptyState title="No active subscription" description="Contact your platform administrator to have a plan assigned." />
          </CardContent>
        </Card>
      )}

      {usage && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} label="Users" value={formatNumber(usage.users)} />
          <StatCard icon={Building2} label="Properties" value={formatNumber(usage.properties)} />
          <StatCard icon={FolderKanban} label="Projects" value={formatNumber(usage.projects)} />
          <StatCard icon={UserRound} label="Portal users" value={formatNumber(usage.portalUsers)} />
          <StatCard icon={FileSignature} label="Active leases" value={formatNumber(usage.activeLeases)} />
          <StatCard icon={HardDrive} label="Storage" value={formatBytes(usage.storageBytes)} />
        </div>
      )}

      {usage && usage.metrics.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Plan limits</CardTitle>
            <CardDescription>{t('billing.planLimitsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="min-w-40">Usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.metrics.map((m) => {
                  const pct = m.limit ? Math.min(100, (m.current / m.limit) * 100) : 0
                  return (
                    <TableRow key={m.code}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <span>
                            {formatNumber(m.current)}{' '}
                            <span className="text-muted-foreground">
                              / {m.limit == null ? t('billing.unlimited') : formatNumber(m.limit)}
                            </span>
                          </span>
                          {m.limit != null && (
                            <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  m.state === UsageState.AtLimit ? 'bg-red-500' : m.state === UsageState.Approaching ? 'bg-amber-500' : 'bg-emerald-500',
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={m.state} labels={UsageStateLabel} tone={USAGE_STATE_TONE[m.state]} />
                      </TableCell>
                    </TableRow>
                  )
                })}
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
                        <StatusBadge status={inv.status} labels={InvoiceStatusLabel} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={page} totalPages={totalPages} total={invoices.meta?.total} itemLabel="invoices" onPageChange={setPage} />
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
            <EmptyState title="No payments recorded yet" description={t('billing.noPaymentsDescription')} />
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
                      <StatusBadge status={p.status} labels={BillingPaymentStatusLabel} />
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
