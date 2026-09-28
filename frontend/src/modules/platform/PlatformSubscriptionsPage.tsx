import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BillingCycleLabel, SubscriptionStatus, SubscriptionStatusLabel, type SubscriptionDto } from '@/types/api'
import { usePlatformSubscriptions } from './api'
import { TransitionSubscriptionDialog } from './TransitionSubscriptionDialog'

const statusVariant: Record<SubscriptionStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  [SubscriptionStatus.Trialing]: 'secondary',
  [SubscriptionStatus.Active]: 'success',
  [SubscriptionStatus.PastDue]: 'warning',
  [SubscriptionStatus.Paused]: 'outline',
  [SubscriptionStatus.Cancelled]: 'destructive',
  [SubscriptionStatus.Expired]: 'destructive',
}

const STATUS_FILTER_ALL = 'all'

export function PlatformSubscriptionsPage() {
  const navigate = useNavigate()
  const { data: subscriptions, isLoading, isError, refetch } = usePlatformSubscriptions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL)
  const [transitioning, setTransitioning] = useState<SubscriptionDto | null>(null)

  const filtered = (subscriptions ?? []).filter((s) => {
    const matchesSearch = search.trim() === '' || s.tenantName.toLowerCase().includes(search.trim().toLowerCase())
    const matchesStatus = statusFilter === STATUS_FILTER_ALL || String(s.status) === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      <PageHeader title="Subscriptions" description="Every tenant subscription across the platform, current and historical." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tenant name…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
            {Object.entries(SubscriptionStatusLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading subscriptions…" />}
      {isError && <ErrorState message="Could not load subscriptions." onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState title="No subscriptions found" description="Try a different search or filter." />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial ends</TableHead>
              <TableHead>Current period</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/platform/organizations/${s.tenantId}`)}>
                <TableCell className="font-medium">{s.tenantName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.planName} <span className="font-mono text-xs">({s.planCode})</span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[s.status]}>{SubscriptionStatusLabel[s.status]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.trialEndsAt)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {s.currentPeriodStart ? `${formatDate(s.currentPeriodStart)} – ${formatDate(s.currentPeriodEnd)}` : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(s.priceSnapshot, s.currency)} / {BillingCycleLabel[s.billingCycle].toLowerCase()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => setTransitioning(s)}>
                    Transition
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TransitionSubscriptionDialog subscription={transitioning} onOpenChange={(open) => !open && setTransitioning(null)} />
    </div>
  )
}
