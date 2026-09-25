import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BillingCycleLabel,
  EntitlementType,
  SubscriptionStatusLabel,
  TenantStatus,
  TenantStatusLabel,
  UsageState,
  UsageStateLabel,
  type SubscriptionStatus,
} from '@/types/api'
import { FEATURE_ENTITLEMENT_CODES, LIMIT_ENTITLEMENT_CODES, entitlementLabel } from '@/lib/entitlementCatalog'
import {
  useAssignSubscription,
  useOrganizationEntitlements,
  useOrganizationSubscription,
  useOrganizationUsage,
  usePlatformOrganization,
  usePlatformSubscriptionPlans,
  useRemoveEntitlementOverride,
  useSetEntitlementOverride,
} from './api'
import { TransitionSubscriptionDialog } from './TransitionSubscriptionDialog'

const statusVariant: Record<TenantStatus, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  [TenantStatus.Trial]: 'secondary',
  [TenantStatus.Active]: 'success',
  [TenantStatus.Suspended]: 'destructive',
  [TenantStatus.Cancelled]: 'outline',
}

const subscriptionStatusVariant: Record<SubscriptionStatus, 'success' | 'secondary' | 'destructive' | 'outline' | 'warning'> = {
  0: 'secondary',
  1: 'success',
  2: 'warning',
  3: 'outline',
  4: 'destructive',
  5: 'destructive',
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

export function PlatformOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: org, isLoading, isError, refetch } = usePlatformOrganization(id)
  const { data: subscription, isLoading: subLoading } = useOrganizationSubscription(id)
  const { data: usage } = useOrganizationUsage(id)
  const { data: entitlements } = useOrganizationEntitlements(id)
  const { data: plans } = usePlatformSubscriptionPlans()

  const [transitioning, setTransitioning] = useState(false)
  const [assignPlanId, setAssignPlanId] = useState('')
  const [skipTrial, setSkipTrial] = useState(false)
  const assignSubscription = useAssignSubscription(id)
  const setOverride = useSetEntitlementOverride(id)
  const removeOverride = useRemoveEntitlementOverride(id)

  const [overrideCode, setOverrideCode] = useState('')
  const [overrideBool, setOverrideBool] = useState(true)
  const [overrideNumeric, setOverrideNumeric] = useState('')

  if (isLoading) return <LoadingState label="Loading organization…" />
  if (isError || !org) return <ErrorState message="Could not load this organization." onRetry={() => refetch()} />

  async function handleAssignPlan() {
    if (!assignPlanId) return
    try {
      await assignSubscription.mutateAsync({ planId: assignPlanId, skipTrial })
      toast({ title: 'Plan assigned', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not assign plan', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  const overrideType = FEATURE_ENTITLEMENT_CODES.includes(overrideCode as (typeof FEATURE_ENTITLEMENT_CODES)[number])
    ? EntitlementType.Feature
    : EntitlementType.Limit

  async function handleAddOverride() {
    if (!overrideCode) return
    try {
      await setOverride.mutateAsync(
        overrideType === EntitlementType.Feature
          ? { code: overrideCode, boolValue: overrideBool, numericValue: null }
          : { code: overrideCode, boolValue: null, numericValue: overrideNumeric.trim() ? Number(overrideNumeric) : null },
      )
      toast({ title: 'Override saved', variant: 'success' })
      setOverrideCode('')
      setOverrideNumeric('')
    } catch (error) {
      toast({ title: 'Could not save override', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  async function handleRemoveOverride(code: string) {
    try {
      await removeOverride.mutateAsync(code)
      toast({ title: 'Override removed', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not remove override', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

  return (
    <div>
      <PageHeader
        title={org.name}
        description={`${org.slug} · Created ${formatDate(org.createdAt)}`}
        actions={<Badge variant={statusVariant[org.status]}>{TenantStatusLabel[org.status]}</Badge>}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Slug</p>
                <p className="font-medium">{org.slug}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timezone</p>
                <p className="font-medium">{org.timezone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact email</p>
                <p className="font-medium">{org.contactEmail ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contact phone</p>
                <p className="font-medium">{org.contactPhone ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trial ends</p>
                <p className="font-medium">{formatDate(org.trialEndsAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(org.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          {subLoading ? (
            <LoadingState label="Loading subscription…" />
          ) : subscription ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>{subscription.planName}</CardTitle>
                  <CardDescription>{subscription.planCode}</CardDescription>
                </div>
                <Badge variant={subscriptionStatusVariant[subscription.status]}>{SubscriptionStatusLabel[subscription.status]}</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium">
                    {formatCurrency(subscription.priceSnapshot, subscription.currency)} / {BillingCycleLabel[subscription.billingCycle].toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cancel at period end</p>
                  <p className="font-medium">{subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</p>
                </div>
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
                {subscription.cancelledAt && (
                  <div>
                    <p className="text-muted-foreground">Cancelled at</p>
                    <p className="font-medium">{formatDate(subscription.cancelledAt)}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" onClick={() => setTransitioning(true)}>
                  Transition status
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No active subscription</CardTitle>
                <CardDescription>Assign a plan to start this tenant's subscription lifecycle.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Plan</Label>
                  <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans ?? [])
                        .filter((p) => p.isActive)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.price, p.currency)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 pb-1.5 text-sm">
                  <Checkbox checked={skipTrial} onCheckedChange={(checked) => setSkipTrial(checked === true)} />
                  Skip trial
                </label>
                <Button onClick={handleAssignPlan} disabled={!assignPlanId || assignSubscription.isPending}>
                  {assignSubscription.isPending ? 'Assigning…' : 'Assign plan'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage">
          {!usage ? (
            <LoadingState label="Loading usage…" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

              <Card>
                <CardHeader>
                  <CardTitle>Limit metrics</CardTitle>
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="entitlements">
          {!entitlements ? (
            <LoadingState label="Loading entitlements…" />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Effective entitlements</CardTitle>
                  <CardDescription>Resolved from a tenant override, else the plan, else the safe default.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entitlements.effective.map((e) => (
                        <TableRow key={e.code}>
                          <TableCell className="font-medium">{entitlementLabel(e.code)}</TableCell>
                          <TableCell className="text-muted-foreground">{e.type === EntitlementType.Feature ? 'Feature' : 'Limit'}</TableCell>
                          <TableCell>
                            {e.type === EntitlementType.Feature ? (
                              <Badge variant={e.enabled ? 'success' : 'outline'}>{e.enabled ? 'Enabled' : 'Disabled'}</Badge>
                            ) : (
                              (e.limit == null ? 'Unlimited' : e.limit)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenant-specific overrides</CardTitle>
                  <CardDescription>Independent of the assigned plan — always wins over it.</CardDescription>
                </CardHeader>
                <CardContent>
                  {entitlements.overrides.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overrides set.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entitlements.overrides.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">{entitlementLabel(o.code)}</TableCell>
                            <TableCell>{o.boolValue != null ? (o.boolValue ? 'Enabled' : 'Disabled') : (o.numericValue ?? 'Unlimited')}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveOverride(o.code)} disabled={removeOverride.isPending}>
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label>Entitlement code</Label>
                    <Select value={overrideCode} onValueChange={setOverrideCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a code" />
                      </SelectTrigger>
                      <SelectContent>
                        {FEATURE_ENTITLEMENT_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {entitlementLabel(code)} (Feature)
                          </SelectItem>
                        ))}
                        {LIMIT_ENTITLEMENT_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {entitlementLabel(code)} (Limit)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {overrideCode &&
                    (overrideType === EntitlementType.Feature ? (
                      <label className="flex items-center gap-2 pb-1.5 text-sm">
                        <Checkbox checked={overrideBool} onCheckedChange={(checked) => setOverrideBool(checked === true)} />
                        Enabled
                      </label>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="override-numeric">Limit (blank = unlimited)</Label>
                        <Input
                          id="override-numeric"
                          type="number"
                          className="w-40"
                          value={overrideNumeric}
                          onChange={(e) => setOverrideNumeric(e.target.value)}
                        />
                      </div>
                    ))}
                  <Button onClick={handleAddOverride} disabled={!overrideCode || setOverride.isPending}>
                    {setOverride.isPending ? 'Saving…' : 'Save override'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TransitionSubscriptionDialog
        subscription={transitioning ? (subscription ?? null) : null}
        onOpenChange={(open) => !open && setTransitioning(false)}
      />
    </div>
  )
}
