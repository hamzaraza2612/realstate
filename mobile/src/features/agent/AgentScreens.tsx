import { useState, type ReactNode } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { pagedTotal } from '@/api/paging'
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LastUpdated,
  ListRow,
  LoadingState,
  PagedList,
  RecordCard,
  SectionRow,
  SegmentedControl,
  StatCard,
  StatusBadge,
  Text,
  type IconName,
} from '@/components'
import { Screen } from '@/components/Screen'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { getTenantLocalization, useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing, useTheme } from '@/theme'
import {
  ActivityStatus,
  ActivityTypeLabel,
  BookingStatusLabel,
  InventoryAreaUnitLabel,
  InventoryStatusLabel,
  InventoryUnitTypeLabel,
  LeadPriorityLabel,
  LeadStatusLabel,
  type ActivityDto,
  type BookingDto,
  type CustomerDto,
  type InventoryUnitDto,
  type LeadDto,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, tenantToday } from '@/utils/format'
import { useAgentBookings, useAgentCustomers, useAgentFollowUps, useAgentInventory, useAgentLeads, useAgentPerformance } from './api'

/**
 * "My sales desk" — the mobile Agent view, an INTERNAL module (Work tab → Agent), not a portal area:
 * the signed-in Sales Agent's own leads, customers, bookings, follow-ups, the available inventory
 * they can sell, and their performance, from the self-scoped `/agent-portal/*` endpoints via the
 * internal `apiClient`. Gated like the web nav entry (`sales.booking.view`); taps open the existing
 * internal CRM / Sales / Projects screens only where the user holds that module's view permission.
 */

const AGENT_PERMISSION = 'sales.booking.view'

const ActivityStatusLabel: Record<ActivityStatus, string> = {
  [ActivityStatus.Pending]: 'Pending',
  [ActivityStatus.Completed]: 'Completed',
}

function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  try {
    return date.toLocaleDateString(getTenantLocalization()?.locale ?? undefined, { month: 'short', year: 'numeric' })
  } catch {
    return `${year}-${String(month).padStart(2, '0')}`
  }
}

/** Renders the screen only for users the web app would show "Agent Portal" to; a deep link from
 * anyone else gets an explanation instead (the API is self-scoped either way — UX only). */
function AgentGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const allowed = usePermission(AGENT_PERMISSION)
  if (!allowed) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="lock-closed-outline" title={t('agent.notAvailableTitle')} description={t('agent.notAvailableDescription')} />
      </Screen>
    )
  }
  return <>{children}</>
}

type Period = 'month' | 'year'

export function AgentHubScreen() {
  return (
    <AgentGate>
      <AgentHub />
    </AgentGate>
  )
}

function AgentHub() {
  const { t } = useI18n()
  const { colors } = useTheme()
  useTenantLocalization()
  const [period, setPeriod] = useState<Period>('month')
  const today = tenantToday()
  const performance = useAgentPerformance(period === 'year' ? { from: `${today.slice(0, 4)}-01-01`, to: today } : {})
  // pageSize 1: only the server's `meta.total` is needed for the counts.
  const leads = useAgentLeads({ pageSize: 1 })
  const followUps = useAgentFollowUps({ pageSize: 1 })
  const bookings = useAgentBookings({ pageSize: 1 })
  const inventory = useAgentInventory({ pageSize: 1 })
  const customers = useAgentCustomers()
  const [refreshing, setRefreshing] = useState(false)

  const rows = performance.data ?? []
  const bookingCount = rows.reduce((sum, r) => sum + r.bookingCount, 0)
  const netSales = rows.reduce((sum, r) => sum + r.totalNetPrice, 0)

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([performance.refetch(), leads.refetch(), followUps.refetch(), bookings.refetch(), inventory.refetch(), customers.refetch()])
    setRefreshing(false)
  }

  const count = (value: number | undefined, loading: boolean) => (loading ? '…' : value == null ? '—' : formatNumber(value))
  const destinations: { icon: IconName; title: string; value: string; href: Href }[] = [
    { icon: 'person-add-outline', title: t('agent.leads'), value: count(pagedTotal(leads.data), leads.isLoading), href: '/agent/leads' },
    { icon: 'alarm-outline', title: t('agent.followUps'), value: count(pagedTotal(followUps.data), followUps.isLoading), href: '/agent/follow-ups' },
    { icon: 'receipt-outline', title: t('agent.bookings'), value: count(pagedTotal(bookings.data), bookings.isLoading), href: '/agent/bookings' },
    { icon: 'people-outline', title: t('agent.customers'), value: count(customers.data?.length, customers.isLoading), href: '/agent/customers' },
    { icon: 'grid-outline', title: t('agent.inventory'), value: count(pagedTotal(inventory.data), inventory.isLoading), href: '/agent/inventory' },
  ]

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <Text variant="bodySmall" color="mutedForeground">
        {t('agent.description')}
      </Text>

      <Card>
        <CardHeader title={t('agent.performance')} />
        <SegmentedControl<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'month', label: t('portal.owner.thisMonth') },
            { value: 'year', label: t('portal.owner.thisYear') },
          ]}
        />
        {performance.isLoading ? (
          <LoadingState rows={2} />
        ) : performance.isError ? (
          <ErrorState message={t('agent.performanceError')} onRetry={() => performance.refetch()} />
        ) : (
          <>
            <View style={styles.grid}>
              <StatCard label={t('agent.bookingsInRange')} value={formatNumber(bookingCount)} />
              <StatCard label={t('agent.netSalesInRange')} value={money(netSales)} />
            </View>
            {rows.length === 0 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('agent.noBookingsInRange')}
              </Text>
            ) : (
              rows.map((row) => (
                <SectionRow
                  key={`${row.year}-${row.month}`}
                  title={monthLabel(row.year, row.month)}
                  subtitle={t('agent.bookingCount', { count: formatNumber(row.bookingCount) })}
                  trailing={
                    <Text variant="bodySmall" style={styles.amount}>
                      {money(row.totalNetPrice)}
                    </Text>
                  }
                />
              ))
            )}
          </>
        )}
      </Card>

      <Card style={styles.linksCard}>
        {destinations.map((d, index) => (
          <View key={d.title} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}>
            <ListRow
              icon={d.icon}
              title={d.title}
              trailing={
                <Text variant="subheading" color="mutedForeground">
                  {d.value}
                </Text>
              }
              onPress={() => router.push(d.href)}
            />
          </View>
        ))}
      </Card>
    </Screen>
  )
}

export function AgentLeadsScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const canOpen = usePermission('crm.lead.view')
  const leads = useAgentLeads()
  return (
    <AgentGate>
      <Screen scroll={false} edges={[]}>
        <PagedList<LeadDto>
          query={leads}
          keyExtractor={(l) => l.id}
          emptyIcon="person-add-outline"
          emptyTitle={t('agent.noLeads')}
          errorMessage={t('crm.leads.loadError')}
          renderItem={(l) => (
            <RecordCard
              title={l.fullName}
              subtitle={[l.companyName, l.phone ?? l.email].filter(Boolean).join(' · ') || null}
              meta={`${t('crm.priorityValue', { priority: enumLabel(LeadPriorityLabel, l.priority) })} · ${formatDay(l.createdAt)}`}
              badge={<StatusBadge status={l.status} labels={LeadStatusLabel} />}
              onPress={canOpen ? () => router.push({ pathname: '/crm/leads/[id]', params: { id: l.id } }) : undefined}
            />
          )}
        />
      </Screen>
    </AgentGate>
  )
}

export function AgentFollowUpsScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const canOpenLead = usePermission('crm.lead.view')
  const canOpenCustomer = usePermission('crm.customer.view')
  const followUps = useAgentFollowUps()

  function target(a: ActivityDto): (() => void) | undefined {
    if (a.leadId && canOpenLead) return () => router.push({ pathname: '/crm/leads/[id]', params: { id: a.leadId! } })
    if (a.customerId && canOpenCustomer) return () => router.push({ pathname: '/crm/customers/[id]', params: { id: a.customerId! } })
    return undefined
  }

  return (
    <AgentGate>
      <Screen scroll={false} edges={[]}>
        <PagedList<ActivityDto>
          query={followUps}
          keyExtractor={(a) => a.id}
          emptyIcon="alarm-outline"
          emptyTitle={t('agent.noFollowUps')}
          errorMessage={t('crm.activities.loadError')}
          renderItem={(a) => (
            <RecordCard
              title={a.subject}
              subtitle={a.description}
              meta={[enumLabel(ActivityTypeLabel, a.type), a.dueDate ? t('crm.activities.due', { date: formatDateTime(a.dueDate) }) : null].filter(Boolean).join(' · ')}
              badge={<StatusBadge status={a.status} labels={ActivityStatusLabel} />}
              onPress={target(a)}
            />
          )}
        />
      </Screen>
    </AgentGate>
  )
}

export function AgentBookingsScreen() {
  const { t } = useI18n()
  const bookings = useAgentBookings()
  useTenantLocalization()
  return (
    <AgentGate>
      <Screen scroll={false} edges={[]}>
        <PagedList<BookingDto>
          query={bookings}
          keyExtractor={(b) => b.id}
          emptyIcon="receipt-outline"
          emptyTitle={t('agent.noBookings')}
          errorMessage={t('sales.bookings.loadError')}
          renderItem={(b) => (
            <RecordCard
              title={`${b.bookingNumber} · ${b.customerName}`}
              subtitle={`${b.projectName} · ${b.inventoryUnitCode}`}
              meta={formatDay(b.bookingDate)}
              badge={<StatusBadge status={b.status} labels={BookingStatusLabel} />}
              amount={money(b.netPrice)}
              onPress={() => router.push({ pathname: '/sales/bookings/[id]', params: { id: b.id } })}
            />
          )}
        />
      </Screen>
    </AgentGate>
  )
}

/** `GET /agent-portal/customers` returns one bounded list (the distinct customers on my bookings). */
export function AgentCustomersScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const canOpen = usePermission('crm.customer.view')
  const customers = useAgentCustomers()
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await customers.refetch()
    setRefreshing(false)
  }

  return (
    <AgentGate>
      <Screen scroll={false} edges={[]}>
        <FlatList<CustomerDto>
          data={customers.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={customers.data ? <LastUpdated updatedAt={customers.dataUpdatedAt} /> : null}
          ListEmptyComponent={
            customers.isLoading ? (
              <LoadingState rows={4} />
            ) : customers.isError ? (
              <ErrorState message={t('crm.customers.loadError')} onRetry={() => customers.refetch()} />
            ) : (
              <EmptyState icon="people-outline" title={t('agent.noCustomers')} />
            )
          }
          renderItem={({ item }) => (
            <RecordCard
              title={item.fullName}
              subtitle={[item.companyName, item.phone, item.email].filter(Boolean).join(' · ') || null}
              onPress={canOpen ? () => router.push({ pathname: '/crm/customers/[id]', params: { id: item.id } }) : undefined}
            />
          )}
        />
      </Screen>
    </AgentGate>
  )
}

export function AgentInventoryScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const canOpenProject = usePermission('projects.view')
  const inventory = useAgentInventory()
  return (
    <AgentGate>
      <Screen scroll={false} edges={[]}>
        <PagedList<InventoryUnitDto>
          query={inventory}
          keyExtractor={(u) => u.id}
          emptyIcon="grid-outline"
          emptyTitle={t('agent.noInventory')}
          errorMessage={t('agent.inventoryError')}
          renderItem={(u) => (
            <RecordCard
              title={u.code}
              subtitle={[u.projectName, u.nodePath].filter(Boolean).join(' · ')}
              meta={[enumLabel(InventoryUnitTypeLabel, u.type), u.areaSize != null ? `${formatNumber(u.areaSize)} ${u.areaUnit != null ? enumLabel(InventoryAreaUnitLabel, u.areaUnit) : ''}`.trim() : null]
                .filter(Boolean)
                .join(' · ')}
              badge={<StatusBadge status={u.status} labels={InventoryStatusLabel} />}
              onPress={canOpenProject ? () => router.push({ pathname: '/projects/[id]', params: { id: u.projectId } }) : undefined}
            />
          )}
        />
      </Screen>
    </AgentGate>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amount: { fontWeight: '600' },
  linksCard: { paddingVertical: spacing.xs, gap: 0 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
})
