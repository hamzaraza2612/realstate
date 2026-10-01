import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { extractErrorMessage, extractStatus } from '@/api/apiClient'
import {
  BottomSheet,
  Button,
  Card,
  CardHeader,
  DetailField,
  DetailScreen,
  ErrorState,
  Input,
  LinkField,
  LoadingState,
  PagedList,
  RecordCard,
  Screen,
  SearchField,
  SectionRow,
  Select,
  StatCard,
  StatusBadge,
  StatusFilter,
  Text,
  useToast,
} from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel, useStatusLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import {
  LeasePaymentFrequencyLabel,
  LeaseStatusLabel,
  MaintenanceCategoryLabel,
  MaintenancePriorityLabel,
  MaintenanceStatus,
  MaintenanceStatusLabel,
  PaymentMethodLabel,
  RentScheduleStatusLabel,
  SecurityDepositStatusLabel,
  type LeaseStatus,
  type MaintenanceRequestDto,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import {
  useChangeMaintenanceStatus,
  useLease,
  useLeases,
  useMaintenanceRequest,
  useMaintenanceRequests,
  useRentPayments,
  useRentSchedule,
  useSecurityDeposit,
} from './api'

// --- Leases ---

export function LeasesListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeaseStatus | undefined>()
  const leases = useLeases({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={leases}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('property.leases.search')} />
            <StatusFilter labels={LeaseStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(l) => l.id}
        emptyIcon="document-text-outline"
        emptyTitle={t('property.leases.empty')}
        errorMessage={t('property.leases.loadError')}
        renderItem={(l) => (
          <RecordCard
            title={`${l.leaseNumber} · ${l.rentalTenantName}`}
            subtitle={`${l.propertyName} · ${l.unitNumber}`}
            meta={`${formatDay(l.startDate)} → ${formatDay(l.endDate)}`}
            badge={<StatusBadge status={l.status} labels={LeaseStatusLabel} />}
            amount={money(l.rentAmount)}
            onPress={() => router.push({ pathname: '/property/leases/[id]', params: { id: l.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One lease with its rent schedule (period status, overdue flags from the server), rent payments
 * received, the security deposit and attached documents (e.g. the signed contract). */
export function LeaseDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const lease = useLease(id)
  const schedule = useRentSchedule(id)
  const payments = useRentPayments(id)
  const deposit = useSecurityDeposit(id)

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
            <LinkField label={t('property.tenant')} value={l.rentalTenantName} icon="person-outline" onPress={() => router.push({ pathname: '/property/tenants/[id]', params: { id: l.rentalTenantId } })} />
            <LinkField label={t('property.unit')} value={`${l.propertyName} · ${l.unitNumber}`} icon="grid-outline" onPress={() => router.push({ pathname: '/property/units/[id]', params: { id: l.unitId } })} />
            <DetailField label={t('property.term')} value={`${formatDay(l.startDate)} → ${formatDay(l.endDate)}`} />
            <DetailField label={t('property.frequency')} value={enumLabel(LeasePaymentFrequencyLabel, l.paymentFrequency)} />
            <DetailField label={t('property.gracePeriod')} value={t('property.days', { count: formatNumber(l.gracePeriodDays) })} />
            {l.terms ? <DetailField label={t('property.terms')} value={l.terms} /> : null}
            {l.notes ? <DetailField label={t('detail.notes')} value={l.notes} /> : null}
          </Card>

          <View style={styles.stats}>
            <StatCard label={t('property.rent')} value={moneyExact(l.rentAmount)} />
            <StatCard label={t('property.securityDeposit')} value={l.securityDeposit != null ? moneyExact(l.securityDeposit) : '—'} />
          </View>

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
              <View>
                {schedule.data!.map((period) => (
                  <SectionRow
                    key={period.id}
                    title={t('property.schedule.period', { number: formatNumber(period.periodNumber), due: formatDay(period.dueDate) })}
                    subtitle={t('property.schedule.amounts', { amount: moneyExact(period.amount), paid: moneyExact(period.paidAmount) })}
                    trailing={<StatusBadge status={period.isOverdue ? 'Overdue' : period.status} labels={period.isOverdue ? undefined : RentScheduleStatusLabel} />}
                  />
                ))}
              </View>
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
              <View>
                {payments.data!.map((payment) => (
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
                ))}
              </View>
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
                {deposit.data.refundedAmount > 0 ? <DetailField label={t('property.deposit.refunded')} value={`${moneyExact(deposit.data.refundedAmount)} · ${formatDay(deposit.data.refundDate)}`} /> : null}
              </>
            ) : extractStatus(deposit.error) === 404 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('property.deposit.none')}
              </Text>
            ) : (
              <ErrorState message={t('property.deposit.loadError')} onRetry={() => deposit.refetch()} />
            )}
          </Card>

          <DocumentsPanel entityType="Lease" entityId={l.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Maintenance requests ---

export function MaintenanceListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MaintenanceStatus | undefined>()
  const requests = useMaintenanceRequests({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={requests}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('property.maintenance.search')} />
            <StatusFilter labels={MaintenanceStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(m) => m.id}
        emptyIcon="hammer-outline"
        emptyTitle={t('property.maintenance.empty')}
        errorMessage={t('property.maintenance.loadError')}
        renderItem={(m) => (
          <RecordCard
            title={`${m.requestNumber} · ${m.facilityName ?? m.propertyName}${m.unitNumber ? ` · ${m.unitNumber}` : ''}`}
            subtitle={m.description}
            meta={`${enumLabel(MaintenanceCategoryLabel, m.category)} · ${t('property.priorityValue', { priority: enumLabel(MaintenancePriorityLabel, m.priority) })} · ${formatDay(m.reportedDate)}`}
            badge={<StatusBadge status={m.status} labels={MaintenanceStatusLabel} />}
            onPress={() => router.push({ pathname: '/property/maintenance/[id]', params: { id: m.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One maintenance request: where, what, who's on it, SLA; an "Update status" action (with
 * `property.maintenance.manage`) and documents — e.g. before/after photos taken on site. */
export function MaintenanceDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const request = useMaintenanceRequest(id)
  const canManage = usePermission('property.maintenance.manage')
  const { isOffline } = useNetworkStatus()
  const [statusOpen, setStatusOpen] = useState(false)

  return (
    <DetailScreen query={request} errorMessage={t('property.maintenance.loadError')}>
      {(m) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {m.requestNumber}
              </Text>
              <StatusBadge status={m.status} labels={MaintenanceStatusLabel} />
            </View>
            <Text variant="body">{m.description}</Text>
            {canManage ? <Button label={t('property.maintenance.updateStatus')} icon="swap-horizontal" variant="outline" onPress={() => setStatusOpen(true)} disabled={isOffline} /> : null}
          </Card>
          <Card>
            {m.facilityId ? (
              <LinkField label={t('facility.facility')} value={m.facilityName ?? '—'} icon="storefront-outline" onPress={() => router.push({ pathname: '/facility/facilities/[id]', params: { id: m.facilityId! } })} />
            ) : (
              <LinkField label={t('property.property')} value={m.propertyName} icon="business-outline" onPress={() => router.push({ pathname: '/property/properties/[id]', params: { id: m.propertyId } })} />
            )}
            {m.unitId ? (
              <LinkField label={t('property.unit')} value={m.unitNumber ?? '—'} icon="grid-outline" onPress={() => router.push({ pathname: '/property/units/[id]', params: { id: m.unitId! } })} />
            ) : null}
            {m.spaceCode ? <DetailField label={t('facility.space')} value={m.spaceCode} /> : null}
            <DetailField label={t('property.tenant')} value={m.rentalTenantName} />
            <DetailField label={t('property.category')} value={enumLabel(MaintenanceCategoryLabel, m.category)} />
            <DetailField label={t('property.priority')} value={enumLabel(MaintenancePriorityLabel, m.priority)} />
            <DetailField label={t('property.reportedDate')} value={formatDay(m.reportedDate)} />
            {m.slaDueAt ? <DetailField label={t('property.slaDue')} value={formatDateTime(m.slaDueAt)} /> : null}
            <DetailField label={t('property.assignedTo')} value={[m.assignedToUserName, m.assignedVendorName].filter(Boolean).join(' · ') || t('crm.unassigned')} />
            {m.completionDate ? <DetailField label={t('property.completionDate')} value={formatDay(m.completionDate)} /> : null}
            {m.resolutionNotes ? <DetailField label={t('property.resolutionNotes')} value={m.resolutionNotes} /> : null}
          </Card>
          <DocumentsPanel entityType="MaintenanceRequest" entityId={m.id} />
          {canManage ? <MaintenanceStatusSheet visible={statusOpen} request={m} onClose={() => setStatusOpen(false)} /> : null}
        </>
      )}
    </DetailScreen>
  )
}

/** Picks a new status and posts it. Which transitions are allowed is decided by the server
 * (`MaintenanceStatusRules`); a disallowed move comes back as an error and is shown as-is. */
function MaintenanceStatusSheet({ visible, request, onClose }: { visible: boolean; request: MaintenanceRequestDto; onClose: () => void }) {
  const { t } = useI18n()
  const statusLabel = useStatusLabel()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const change = useChangeMaintenanceStatus()
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [notes, setNotes] = useState('')

  function close() {
    setStatus(null)
    setNotes('')
    onClose()
  }

  async function submit() {
    if (status === null) return
    try {
      await change.mutateAsync({ id: request.id, status, resolutionNotes: status === MaintenanceStatus.Resolved ? notes.trim() || null : null })
      toast({ title: t('property.maintenance.statusUpdated', { status: statusLabel(MaintenanceStatusLabel, status) }), variant: 'success' })
      close()
    } catch (error) {
      toast({ title: t('property.maintenance.statusError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  const options = (Object.keys(MaintenanceStatusLabel) as unknown as string[])
    .map(Number)
    .filter((value) => value !== request.status)
    .map((value) => ({ value: String(value), label: statusLabel(MaintenanceStatusLabel, value as MaintenanceStatus) }))

  return (
    <BottomSheet visible={visible} title={t('property.maintenance.updateStatus')} onClose={close}>
      <Text variant="bodySmall" color="mutedForeground">
        {t('property.maintenance.currentStatus', { status: statusLabel(MaintenanceStatusLabel, request.status) })}
      </Text>
      <Select label={t('property.maintenance.newStatus')} value={status === null ? null : String(status)} options={options} onChange={(value) => setStatus(Number(value) as MaintenanceStatus)} />
      {status === MaintenanceStatus.Resolved ? (
        <Input label={t('property.resolutionNotes')} value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      ) : null}
      {isOffline ? (
        <Text variant="bodySmall" color="destructive">
          {t('offline.actionDisabled')}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('common.cancel')} variant="outline" onPress={close} style={styles.flex} />
        <Button label={t('common.save')} onPress={submit} loading={change.isPending} disabled={status === null || isOffline} style={styles.flex} />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
})
