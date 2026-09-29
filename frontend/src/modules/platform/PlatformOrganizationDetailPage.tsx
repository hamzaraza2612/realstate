import { Building2, FileSignature, FolderKanban, HardDrive, UserRound, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { useCountries } from '@/modules/settings/api'
import {
  BillingCycleLabel,
  EntitlementType,
  FirstDayOfWeek,
  FirstDayOfWeekLabel,
  MeasurementSystem,
  MeasurementSystemLabel,
  SubscriptionStatusLabel,
  TenantStatusLabel,
  UsageStateLabel,
} from '@/types/api'
import { FEATURE_ENTITLEMENT_CODES, LIMIT_ENTITLEMENT_CODES, USAGE_STATE_TONE, entitlementLabel } from '@/lib/entitlementCatalog'
import {
  useAssignSubscription,
  useOrganizationEntitlements,
  useOrganizationSubscription,
  useOrganizationUsage,
  usePlatformOrganization,
  usePlatformSubscriptionPlans,
  useRemoveEntitlementOverride,
  useSetEntitlementOverride,
  useUpdateOrganizationLocalization,
} from './api'
import { TransitionSubscriptionDialog } from './TransitionSubscriptionDialog'

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

  const { data: countries } = useCountries()
  const updateLocalization = useUpdateOrganizationLocalization(id)
  const [locForm, setLocForm] = useState({
    countryCode: '',
    currency: '',
    locale: '',
    timezone: '',
    dateFormat: 'MM/DD/YYYY',
    firstDayOfWeek: String(FirstDayOfWeek.Sunday),
    defaultLanguage: 'en',
    measurementSystem: String(MeasurementSystem.Metric),
  })

  // Seeds the edit form from what OrganizationDto already carries (countryCode/currency/locale) —
  // the fuller TenantLocalizationDto (dateFormat/firstDayOfWeek/measurementSystem) is only
  // exposed via the tenant-scoped `/localization/current`, which a platform admin can't call for
  // another tenant, so those fields start from sane defaults instead of the tenant's actual saved
  // values.
  useEffect(() => {
    if (org) {
      setLocForm((f) => ({
        ...f,
        countryCode: org.countryCode ?? '',
        currency: org.currency ?? '',
        locale: org.locale ?? '',
        timezone: org.timezone,
        defaultLanguage: org.defaultLanguage === 'ar' ? 'ar' : 'en',
      }))
    }
  }, [org])

  if (isLoading) return <LoadingState label="Loading organization…" />
  if (isError || !org) return <ErrorState message="Could not load this organization." onRetry={() => refetch()} />

  function handleLocCountryChange(value: string) {
    const country = countries?.find((c) => c.alpha2 === value)
    setLocForm((f) => ({
      ...f,
      countryCode: value,
      currency: country?.defaultCurrency ?? f.currency,
      locale: country?.defaultLocale ?? f.locale,
      timezone: country?.defaultTimezone ?? f.timezone,
    }))
  }

  async function handleSaveLocalization() {
    try {
      await updateLocalization.mutateAsync({
        countryCode: locForm.countryCode || null,
        currency: locForm.currency,
        locale: locForm.locale,
        timezone: locForm.timezone,
        dateFormat: locForm.dateFormat,
        firstDayOfWeek: Number(locForm.firstDayOfWeek) as FirstDayOfWeek,
        defaultLanguage: locForm.defaultLanguage,
        secondaryLanguages: null,
        measurementSystem: Number(locForm.measurementSystem) as MeasurementSystem,
      })
      toast({ title: 'Localization updated', variant: 'success' })
    } catch (error) {
      toast({ title: 'Could not update localization', description: extractErrorMessage(error), variant: 'destructive' })
    }
  }

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
        actions={<StatusBadge status={org.status} labels={TenantStatusLabel} />}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
          <TabsTrigger value="localization">Localization</TabsTrigger>
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
                <StatusBadge status={subscription.status} labels={SubscriptionStatusLabel} />
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
                <StatCard icon={Users} label="Users" value={formatNumber(usage.users)} />
                <StatCard icon={Building2} label="Properties" value={formatNumber(usage.properties)} />
                <StatCard icon={FolderKanban} label="Projects" value={formatNumber(usage.projects)} />
                <StatCard icon={UserRound} label="Portal users" value={formatNumber(usage.portalUsers)} />
                <StatCard icon={FileSignature} label="Active leases" value={formatNumber(usage.activeLeases)} />
                <StatCard icon={HardDrive} label="Storage" value={formatBytes(usage.storageBytes)} />
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
                            <StatusBadge status={m.state} labels={UsageStateLabel} tone={USAGE_STATE_TONE[m.state]} />
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
                              <StatusBadge status={e.enabled ? 'Enabled' : 'Disabled'} tone={e.enabled ? 'success' : 'neutral'} />
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

        <TabsContent value="localization">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current localization</CardTitle>
                <CardDescription>Read-only summary from this tenant's organization record.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-medium">{countries?.find((c) => c.alpha2 === org.countryCode)?.name ?? org.countryCode ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Currency</p>
                  <p className="font-medium">{org.currency ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Locale</p>
                  <p className="font-medium">{org.locale ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timezone</p>
                  <p className="font-medium">{org.timezone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Default language</p>
                  <p className="font-medium">{org.defaultLanguage ?? '—'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit localization</CardTitle>
                <CardDescription>
                  Configures this tenant's localization directly — useful right after onboarding, before the tenant sets it themselves
                  under Settings → Localization.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Country</Label>
                  <Select value={locForm.countryCode} onValueChange={handleLocCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {(countries ?? []).map((c) => (
                        <SelectItem key={c.alpha2} value={c.alpha2}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="loc-currency">Currency</Label>
                  <Input
                    id="loc-currency"
                    value={locForm.currency}
                    onChange={(e) => setLocForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="loc-locale">Locale</Label>
                  <Input id="loc-locale" value={locForm.locale} onChange={(e) => setLocForm((f) => ({ ...f, locale: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="loc-timezone">Timezone</Label>
                  <Input id="loc-timezone" value={locForm.timezone} onChange={(e) => setLocForm((f) => ({ ...f, timezone: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="loc-date-format">Date format</Label>
                  <Input
                    id="loc-date-format"
                    value={locForm.dateFormat}
                    onChange={(e) => setLocForm((f) => ({ ...f, dateFormat: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>First day of week</Label>
                  <Select value={locForm.firstDayOfWeek} onValueChange={(v) => setLocForm((f) => ({ ...f, firstDayOfWeek: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FirstDayOfWeekLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Default language</Label>
                  <Select value={locForm.defaultLanguage} onValueChange={(v) => setLocForm((f) => ({ ...f, defaultLanguage: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Measurement system</Label>
                  <Select value={locForm.measurementSystem} onValueChange={(v) => setLocForm((f) => ({ ...f, measurementSystem: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(MeasurementSystem.Metric)}>{MeasurementSystemLabel[MeasurementSystem.Metric]}</SelectItem>
                      <SelectItem value={String(MeasurementSystem.Imperial)}>{MeasurementSystemLabel[MeasurementSystem.Imperial]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveLocalization} disabled={updateLocalization.isPending}>
                  {updateLocalization.isPending ? 'Saving…' : 'Save localization'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <TransitionSubscriptionDialog
        subscription={transitioning ? (subscription ?? null) : null}
        onOpenChange={(open) => !open && setTransitioning(false)}
      />
    </div>
  )
}
