import { useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { extractStatus } from '@/api/portalApiClient'
import { flattenPages, pagedTotal } from '@/api/pagedQuery'
import {
  Button,
  Card,
  CardHeader,
  DetailField,
  DetailScreen,
  EmptyState,
  ErrorState,
  Input,
  LastUpdated,
  LoadingState,
  PagedList,
  RecordCard,
  SectionRow,
  Select,
  StatCard,
  StatusBadge,
  Text,
  useToast,
} from '@/components'
import { Screen } from '@/components/Screen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing, useTheme } from '@/theme'
import {
  LeasePaymentFrequencyLabel,
  LeaseStatus,
  LeaseStatusLabel,
  MaintenanceCategory,
  MaintenanceCategoryLabel,
  MaintenancePriority,
  MaintenancePriorityLabel,
  MaintenanceStatus,
  MaintenanceStatusLabel,
  PaymentMethodLabel,
  RentScheduleStatus,
  RentScheduleStatusLabel,
  SecurityDepositStatusLabel,
  type LeaseDto,
  type MaintenanceRequestDto,
  type RentScheduleDto,
} from '@/types/modules'
import { formatDay, formatNumber, money, moneyExact, tenantToday } from '@/utils/format'
import {
  HOME_SAMPLE_SIZE,
  useCreateTenantMaintenanceRequest,
  useTenantLease,
  useTenantLeasePayments,
  useTenantLeases,
  useTenantMaintenanceRequests,
  useTenantPayments,
  useTenantRentSchedule,
  useTenantSecurityDeposit,
} from '../api/resources'
import { portalErrorMessage } from '../api/common'
import { MaintenanceRequestCard, MaintenanceRequestSheet } from '../components/MaintenanceRequestViews'
import { HomeLinks, PortalHomeScaffold, StatGrid } from '../components/PortalHome'

/**
 * Tenant portal (`/portal/tenant`): leases with rent schedule / payments / security deposit, rent
 * payment history, documents, notifications — and the one real write a tenant has: filing a
 * maintenance request (`POST /portal/tenant/maintenance-requests`), disabled while offline.
 */

const leaseHref = (id: string) => ({ pathname: '/portal/tenant/lease/[id]' as const, params: { id } })
const newRequestHref = (leaseId?: string) => ({ pathname: '/portal/tenant/maintenance/new' as const, params: leaseId ? { leaseId } : {} })

/** A lease the backend accepts a maintenance request against (`PortalTenantService`: Active or
 * PendingApproval only). */
function canReportAgainst(lease: LeaseDto) {
  return lease.status === LeaseStatus.Active || lease.status === LeaseStatus.PendingApproval
}

function isUnpaid(period: RentScheduleDto) {
  return period.status !== RentScheduleStatus.Paid && period.status !== RentScheduleStatus.Cancelled && period.amount - period.paidAmount > 0
}

function isOpenRequest(request: MaintenanceRequestDto) {
  return request.status !== MaintenanceStatus.Resolved && request.status !== MaintenanceStatus.Cancelled
}

export function TenantHomeScreen() {
  const { t } = useI18n()
  const leases = useTenantLeases({ pageSize: HOME_SAMPLE_SIZE })
  const leaseItems = flattenPages(leases.data)
  const activeLease = leaseItems.find((l) => l.status === LeaseStatus.Active) ?? leaseItems[0]
  const schedule = useTenantRentSchedule(activeLease?.id)
  const maintenance = useTenantMaintenanceRequests({ pageSize: HOME_SAMPLE_SIZE })
  const requests = flattenPages(maintenance.data)

  const today = tenantToday()
  const unpaid = (schedule.data ?? []).filter(isUnpaid).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const nextDue = unpaid[0]
  const nextOverdue = !!nextDue && (nextDue.isOverdue || nextDue.status === RentScheduleStatus.Overdue || nextDue.dueDate < today)
  const outstanding = unpaid.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0)
  const openRequests = requests.filter(isOpenRequest).length
  const scheduleLoading = leases.isLoading || (!!activeLease && schedule.isLoading)

  return (
    <PortalHomeScaffold refetch={() => Promise.all([leases.refetch(), schedule.refetch(), maintenance.refetch()])}>
      {leases.isError ? <ErrorState message={t('portal.home.loadError')} onRetry={() => leases.refetch()} /> : null}
      <StatGrid>
        <StatCard
          icon="calendar-outline"
          label={t('portal.tenant.nextRentDue')}
          value={scheduleLoading ? '…' : nextDue ? moneyExact(nextDue.amount - nextDue.paidAmount) : '—'}
          hint={scheduleLoading ? undefined : nextDue ? t(nextOverdue ? 'portal.overdueSince' : 'portal.dueOn', { date: formatDay(nextDue.dueDate) }) : t('portal.nothingDue')}
          onPress={activeLease ? () => router.push(leaseHref(activeLease.id)) : undefined}
        />
        <StatCard
          icon="wallet-outline"
          label={t('portal.tenant.outstandingRent')}
          value={scheduleLoading ? '…' : money(outstanding)}
          hint={activeLease ? activeLease.leaseNumber : undefined}
          onPress={activeLease ? () => router.push(leaseHref(activeLease.id)) : undefined}
        />
        <StatCard
          icon="hammer-outline"
          label={t('portal.tenant.openRequests')}
          value={maintenance.isLoading ? '…' : maintenance.isError ? '—' : formatNumber(openRequests)}
          hint={maintenance.data ? t('list.totalCount', { total: formatNumber(pagedTotal(maintenance.data) ?? 0) }) : undefined}
          onPress={() => router.push('/portal/tenant/maintenance')}
        />
      </StatGrid>

      <Card>
        <CardHeader title={t('portal.tenant.currentLease')} />
        {leases.isLoading ? (
          <LoadingState rows={1} />
        ) : !activeLease ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.tenant.noLease')}
          </Text>
        ) : (
          <SectionRow
            title={`${activeLease.leaseNumber} · ${activeLease.propertyName} · ${activeLease.unitNumber}`}
            subtitle={`${formatDay(activeLease.startDate)} → ${formatDay(activeLease.endDate)} · ${t('portal.tenant.rentPer', { amount: moneyExact(activeLease.rentAmount) })}`}
            trailing={<StatusBadge status={activeLease.status} labels={LeaseStatusLabel} />}
            onPress={() => router.push(leaseHref(activeLease.id))}
          />
        )}
      </Card>

      <Button label={t('portal.tenant.reportIssue')} icon="construct-outline" onPress={() => router.push(newRequestHref(activeLease && canReportAgainst(activeLease) ? activeLease.id : undefined))} fullWidth />

      <HomeLinks
        links={[
          { icon: 'hammer-outline', title: t('portal.tenant.maintenance'), subtitle: t('portal.tenant.maintenanceLink'), href: '/portal/tenant/maintenance' },
          { icon: 'wallet-outline', title: t('portal.payments.title'), subtitle: t('portal.tenant.paymentsLink'), href: '/portal/tenant/payments' },
        ]}
      />
    </PortalHomeScaffold>
  )
}

export function TenantLeasesScreen() {
  const { t } = useI18n()
  const leases = useTenantLeases()
  useTenantLocalization()
  return (
    <Screen scroll={false}>
      <PagedList<LeaseDto>
        query={leases}
        header={<Text variant="title">{t('property.leases.title')}</Text>}
        keyExtractor={(l) => l.id}
        emptyIcon="document-text-outline"
        emptyTitle={t('portal.tenant.noLease')}
        errorMessage={t('property.leases.loadError')}
        renderItem={(l) => (
          <RecordCard
            title={l.leaseNumber}
            subtitle={`${l.propertyName} · ${l.unitNumber}`}
            meta={`${formatDay(l.startDate)} → ${formatDay(l.endDate)}`}
            badge={<StatusBadge status={l.status} labels={LeaseStatusLabel} />}
            amount={money(l.rentAmount)}
            onPress={() => router.push(leaseHref(l.id))}
          />
        )}
      />
    </Screen>
  )
}

/** One of the tenant's leases: terms, rent schedule (server-computed overdue flags), rent payments,
 * the security deposit, and a "Report an issue" shortcut pre-filled with this lease. */
export function TenantLeaseDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const lease = useTenantLease(id)
  const schedule = useTenantRentSchedule(id)
  const payments = useTenantLeasePayments(id)
  const deposit = useTenantSecurityDeposit(id)

  return (
    <DetailScreen query={lease} errorMessage={t('property.leases.loadError')} refetchAlso={[schedule, payments, deposit]}>
      {(l) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {l.leaseNumber}
              </Text>
              <StatusBadge status={l.status} labels={LeaseStatusLabel} />
            </View>
            <DetailField label={t('property.unit')} value={`${l.propertyName} · ${l.unitNumber}`} />
            <DetailField label={t('property.term')} value={`${formatDay(l.startDate)} → ${formatDay(l.endDate)}`} />
            <DetailField label={t('property.frequency')} value={enumLabel(LeasePaymentFrequencyLabel, l.paymentFrequency)} />
            <DetailField label={t('property.gracePeriod')} value={t('property.days', { count: formatNumber(l.gracePeriodDays) })} />
            {l.terms ? <DetailField label={t('property.terms')} value={l.terms} /> : null}
          </Card>

          <StatGrid>
            <StatCard label={t('property.rent')} value={moneyExact(l.rentAmount)} />
            <StatCard label={t('property.securityDeposit')} value={l.securityDeposit != null ? moneyExact(l.securityDeposit) : '—'} />
          </StatGrid>

          {canReportAgainst(l) ? <Button label={t('portal.tenant.reportIssue')} icon="construct-outline" variant="outline" onPress={() => router.push(newRequestHref(l.id))} fullWidth /> : null}

          <Card>
            <CardHeader title={t('property.schedule.title')} />
            {schedule.isLoading ? (
              <LoadingState rows={2} />
            ) : schedule.isError ? (
              <ErrorState message={t('property.schedule.loadError')} onRetry={() => schedule.refetch()} />
            ) : (schedule.data ?? []).length === 0 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('property.schedule.empty')}
              </Text>
            ) : (
              schedule.data!.map((period) => (
                <SectionRow
                  key={period.id}
                  title={t('property.schedule.period', { number: formatNumber(period.periodNumber), due: formatDay(period.dueDate) })}
                  subtitle={t('property.schedule.amounts', { amount: moneyExact(period.amount), paid: moneyExact(period.paidAmount) })}
                  trailing={<StatusBadge status={period.isOverdue ? 'Overdue' : period.status} labels={period.isOverdue ? undefined : RentScheduleStatusLabel} />}
                />
              ))
            )}
          </Card>

          <Card>
            <CardHeader title={t('property.payments.title')} />
            {payments.isLoading ? (
              <LoadingState rows={2} />
            ) : payments.isError ? (
              <ErrorState message={t('property.payments.loadError')} onRetry={() => payments.refetch()} />
            ) : (payments.data ?? []).length === 0 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('property.payments.empty')}
              </Text>
            ) : (
              payments.data!.map((payment) => (
                <SectionRow
                  key={payment.id}
                  title={`${payment.receiptNumber} · ${t('property.schedule.periodShort', { number: formatNumber(payment.rentSchedulePeriodNumber) })}`}
                  subtitle={`${formatDay(payment.paymentDate)} · ${enumLabel(PaymentMethodLabel, payment.method)}`}
                  trailing={
                    <Text variant="bodySmall" style={styles.amount}>
                      {moneyExact(payment.amount)}
                    </Text>
                  }
                />
              ))
            )}
          </Card>

          <Card>
            <CardHeader title={t('property.deposit.title')} />
            {deposit.isLoading ? (
              <LoadingState rows={1} />
            ) : deposit.data ? (
              <>
                <View style={styles.titleRow}>
                  <Text variant="body" style={styles.flex}>
                    {moneyExact(deposit.data.amount)}
                  </Text>
                  <StatusBadge status={deposit.data.status} labels={SecurityDepositStatusLabel} />
                </View>
                <DetailField label={t('property.deposit.received')} value={formatDay(deposit.data.receivedDate)} />
                {deposit.data.refundedAmount > 0 ? (
                  <DetailField label={t('property.deposit.refunded')} value={`${moneyExact(deposit.data.refundedAmount)} · ${formatDay(deposit.data.refundDate)}`} />
                ) : null}
              </>
            ) : extractStatus(deposit.error) === 404 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('property.deposit.none')}
              </Text>
            ) : (
              <ErrorState message={t('property.deposit.loadError')} onRetry={() => deposit.refetch()} />
            )}
          </Card>
        </>
      )}
    </DetailScreen>
  )
}

/** The tenant's maintenance requests (server-paged), newest first; tap for the full request. */
export function TenantMaintenanceScreen() {
  const { t } = useI18n()
  const { isOffline } = useNetworkStatus()
  const requests = useTenantMaintenanceRequests()
  const [selected, setSelected] = useState<MaintenanceRequestDto | null>(null)
  return (
    <Screen scroll={false} edges={[]}>
      <PagedList<MaintenanceRequestDto>
        query={requests}
        header={
          <>
            <Button label={t('portal.tenant.reportIssue')} icon="add" onPress={() => router.push(newRequestHref())} disabled={isOffline} fullWidth />
            {isOffline ? (
              <Text variant="caption" color="destructive">
                {t('offline.actionDisabled')}
              </Text>
            ) : null}
          </>
        }
        keyExtractor={(m) => m.id}
        emptyIcon="hammer-outline"
        emptyTitle={t('portal.tenant.noRequests')}
        emptyDescription={t('portal.tenant.noRequestsDescription')}
        errorMessage={t('property.maintenance.loadError')}
        renderItem={(m) => <MaintenanceRequestCard request={m} onPress={() => setSelected(m)} />}
      />
      <MaintenanceRequestSheet request={selected} onClose={() => setSelected(null)} />
    </Screen>
  )
}

/**
 * "Report an issue" — a real `POST /portal/tenant/maintenance-requests` ({ leaseId, category,
 * priority, description }; property/unit derived server-side from the lease). Success is shown only
 * from the server's created record (its request number and status); a rejection shows the server's
 * own message. Submitting is disabled while offline — nothing is ever queued.
 */
export function TenantNewMaintenanceScreen({ initialLeaseId }: { initialLeaseId?: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const { colors } = useTheme()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const leases = useTenantLeases({ pageSize: HOME_SAMPLE_SIZE })
  const eligible = flattenPages(leases.data).filter(canReportAgainst)
  const create = useCreateTenantMaintenanceRequest()

  const [leaseId, setLeaseId] = useState<string | null>(initialLeaseId ?? null)
  const [category, setCategory] = useState<MaintenanceCategory>(MaintenanceCategory.Other)
  const [priority, setPriority] = useState<MaintenancePriority>(MaintenancePriority.Medium)
  const [description, setDescription] = useState('')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [created, setCreated] = useState<MaintenanceRequestDto | null>(null)

  // Most tenants have exactly one current lease — preselect it once the list arrives.
  const firstEligibleId = eligible[0]?.id
  useEffect(() => {
    if (!leaseId && firstEligibleId) setLeaseId(firstEligibleId)
  }, [leaseId, firstEligibleId])

  const descriptionError = touched && !description.trim() ? t('portal.tenant.form.descriptionRequired') : undefined
  const canSubmit = !!leaseId && !!description.trim() && !isOffline && !create.isPending

  async function submit() {
    setTouched(true)
    setServerError(null)
    if (!leaseId || !description.trim() || isOffline) return
    try {
      const result = await create.mutateAsync({ leaseId, category, priority, description: description.trim() })
      setCreated(result)
      toast({ title: t('portal.tenant.form.submitted', { number: result.requestNumber }), variant: 'success' })
    } catch (error) {
      const message = portalErrorMessage(error, t('common.somethingWentWrong'))
      setServerError(message)
      toast({ title: t('portal.tenant.form.submitError'), description: message, variant: 'error' })
    }
  }

  function reset() {
    setCreated(null)
    setDescription('')
    setTouched(false)
    setServerError(null)
    setCategory(MaintenanceCategory.Other)
    setPriority(MaintenancePriority.Medium)
  }

  if (created) {
    return (
      <Screen edges={[]}>
        <Card>
          <View style={styles.titleRow}>
            <Text variant="heading" style={styles.flex}>
              {t('portal.tenant.form.createdTitle', { number: created.requestNumber })}
            </Text>
            <StatusBadge status={created.status} labels={MaintenanceStatusLabel} />
          </View>
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.tenant.form.createdDescription')}
          </Text>
          <DetailField label={t('portal.maintenance.location')} value={`${created.propertyName}${created.unitNumber ? ` · ${created.unitNumber}` : ''}`} />
          <DetailField label={t('portal.maintenance.issue')} value={created.description} />
          <DetailField label={t('property.category')} value={enumLabel(MaintenanceCategoryLabel, created.category)} />
          <DetailField label={t('property.priority')} value={enumLabel(MaintenancePriorityLabel, created.priority)} />
          <DetailField label={t('property.reportedDate')} value={formatDay(created.reportedDate)} />
        </Card>
        <Button label={t('portal.tenant.form.viewRequests')} icon="list-outline" onPress={() => router.replace('/portal/tenant/maintenance')} fullWidth />
        <Button label={t('portal.tenant.form.reportAnother')} variant="outline" onPress={reset} fullWidth />
      </Screen>
    )
  }

  const leaseOptions = eligible.map((l) => ({ value: l.id, label: `${l.leaseNumber} · ${l.propertyName} · ${l.unitNumber}` }))
  const categoryOptions = (Object.keys(MaintenanceCategoryLabel) as unknown as string[]).map((key) => ({
    value: key,
    label: enumLabel(MaintenanceCategoryLabel, Number(key) as MaintenanceCategory),
  }))
  const priorityOptions = (Object.keys(MaintenancePriorityLabel) as unknown as string[]).map((key) => ({
    value: key,
    label: enumLabel(MaintenancePriorityLabel, Number(key) as MaintenancePriority),
  }))

  return (
    <Screen edges={[]}>
      <Text variant="bodySmall" color="mutedForeground">
        {t('portal.tenant.form.intro')}
      </Text>
      {leases.isLoading ? (
        <LoadingState rows={2} />
      ) : leases.isError ? (
        <ErrorState message={t('property.leases.loadError')} onRetry={() => leases.refetch()} />
      ) : eligible.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('portal.tenant.form.noEligibleLease')} description={t('portal.tenant.form.noEligibleLeaseDescription')} />
      ) : (
        <Card>
          <Select label={t('portal.tenant.form.lease')} value={leaseId} options={leaseOptions} onChange={setLeaseId} />
          <Select label={t('property.category')} value={String(category)} options={categoryOptions} onChange={(value) => setCategory(Number(value) as MaintenanceCategory)} />
          <Select label={t('property.priority')} value={String(priority)} options={priorityOptions} onChange={(value) => setPriority(Number(value) as MaintenancePriority)} />
          <Input
            label={t('portal.tenant.form.description')}
            placeholder={t('portal.tenant.form.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            onBlur={() => setTouched(true)}
            multiline
            numberOfLines={4}
            maxLength={2000}
            error={descriptionError}
          />
          {serverError ? (
            <View style={[styles.serverError, { borderColor: colors.destructive }]}>
              <Text variant="bodySmall" color="destructive" accessibilityRole="alert">
                {serverError}
              </Text>
            </View>
          ) : null}
          {isOffline ? (
            <Text variant="bodySmall" color="destructive">
              {t('offline.actionDisabled')}
            </Text>
          ) : null}
          <Button label={t('portal.tenant.form.submit')} icon="send-outline" onPress={submit} loading={create.isPending} disabled={!canSubmit} fullWidth />
        </Card>
      )}
    </Screen>
  )
}

/** All of the tenant's rent payments across every lease (`GET /portal/tenant/payments` — one bounded
 * list from the backend, not paged). */
export function TenantPaymentsScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const { colors } = useTheme()
  const payments = useTenantPayments()
  const [refreshing, setRefreshing] = useState(false)
  const rows = payments.data ?? []
  const totalPaid = rows.reduce((sum, entry) => sum + entry.payment.amount, 0)

  async function onRefresh() {
    setRefreshing(true)
    await payments.refetch()
    setRefreshing(false)
  }

  return (
    <Screen scroll={false} edges={[]}>
      <FlatList
        data={rows}
        keyExtractor={(entry) => entry.payment.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          payments.data ? (
            <View style={styles.header}>
              <LastUpdated updatedAt={payments.dataUpdatedAt} />
              <StatGrid>
                <StatCard label={t('portal.totalPaid')} value={money(totalPaid)} hint={t('portal.paymentsCount', { count: formatNumber(rows.length) })} />
              </StatGrid>
            </View>
          ) : null
        }
        ListEmptyComponent={
          payments.isLoading ? (
            <LoadingState rows={4} />
          ) : payments.isError ? (
            <ErrorState message={t('property.payments.loadError')} onRetry={() => payments.refetch()} />
          ) : (
            <EmptyState icon="wallet-outline" title={t('property.payments.empty')} />
          )
        }
        renderItem={({ item }) => (
          <RecordCard
            title={`${item.payment.receiptNumber} · ${item.leaseNumber}`}
            subtitle={t('property.schedule.periodShort', { number: formatNumber(item.payment.rentSchedulePeriodNumber) })}
            meta={`${formatDay(item.payment.paymentDate)} · ${enumLabel(PaymentMethodLabel, item.payment.method)}`}
            amount={moneyExact(item.payment.amount)}
            onPress={() => router.push(leaseHref(item.leaseId))}
          />
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  serverError: { borderWidth: 1, borderRadius: 8, padding: spacing.sm },
})
