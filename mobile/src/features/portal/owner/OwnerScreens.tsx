import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import {
  Card,
  CardHeader,
  DetailField,
  DetailScreen,
  EmptyState,
  ErrorState,
  LastUpdated,
  LoadingState,
  PagedList,
  RecordCard,
  SectionRow,
  SegmentedControl,
  StatCard,
  StatusBadge,
  Text,
} from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing, useTheme } from '@/theme'
import { PropertyType, PropertyTypeLabel, type MaintenanceRequestDto } from '@/types/modules'
import type { OwnerPropertyDto } from '@/types/portal'
import { formatDay, formatNumber, money, moneyExact, tenantToday } from '@/utils/format'
import { useOwnerMaintenanceRequests, useOwnerOverdueRent, useOwnerProperties, useOwnerProperty, useOwnerRentCollected, useOwnerRevenue } from '../api/resources'
import { MaintenanceRequestCard, MaintenanceRequestSheet } from '../components/MaintenanceRequestViews'
import { HomeLinks, PortalHomeScaffold, StatGrid } from '../components/PortalHome'

/**
 * Property-owner portal (`/portal/owner`) — read-only by design: the owner's properties with
 * occupancy and per-unit status, rent collected / revenue / overdue rent (the backend's Milestone 12
 * property reports filtered to this owner's properties — nothing recomputed here beyond summing the
 * returned rows), the maintenance requests on their properties, documents and notifications.
 */

const propertyHref = (id: string) => ({ pathname: '/portal/owner/property/[id]' as const, params: { id } })

function percent(value: number) {
  return formatNumber(value / 100, { style: 'percent', maximumFractionDigits: 0 })
}

/** `OwnerPropertyDetailDto.type` is the C# enum NAME ("ApartmentComplex"); map it back through the
 * shared `PropertyType` table so it gets the same (translated) label as everywhere else. */
function usePropertyTypeLabel() {
  const enumLabel = useEnumLabel()
  return (name: string) => {
    const value = (PropertyType as Record<string, PropertyType | undefined>)[name]
    return value === undefined ? name : enumLabel(PropertyTypeLabel, value)
  }
}

export function OwnerHomeScreen() {
  const { t } = useI18n()
  const properties = useOwnerProperties()
  const collected = useOwnerRentCollected()
  const overdue = useOwnerOverdueRent()
  const list = properties.data ?? []

  const totalUnits = list.reduce((sum, p) => sum + p.totalUnits, 0)
  const occupiedUnits = list.reduce((sum, p) => sum + p.occupiedUnits, 0)
  const totalCollected = (collected.data ?? []).reduce((sum, row) => sum + row.amountCollected, 0)
  const overdueRows = overdue.data ?? []
  const totalOverdue = overdueRows.reduce((sum, row) => sum + row.outstandingAmount, 0)

  return (
    <PortalHomeScaffold refetch={() => Promise.all([properties.refetch(), collected.refetch(), overdue.refetch()])}>
      {properties.isError ? <ErrorState message={t('portal.home.loadError')} onRetry={() => properties.refetch()} /> : null}
      <StatGrid>
        <StatCard
          icon="cash-outline"
          label={t('portal.owner.rentCollectedMonth')}
          value={collected.isLoading ? '…' : collected.isError ? '—' : money(totalCollected)}
          onPress={() => router.push('/portal/owner/reports')}
        />
        <StatCard
          icon="alert-circle-outline"
          label={t('portal.owner.overdueRent')}
          value={overdue.isLoading ? '…' : overdue.isError ? '—' : money(totalOverdue)}
          hint={overdue.data ? t('portal.owner.overdueLeases', { count: formatNumber(overdueRows.length) }) : undefined}
          onPress={() => router.push('/portal/owner/reports')}
        />
        <StatCard
          icon="business-outline"
          label={t('portal.owner.occupancy')}
          value={properties.isLoading ? '…' : totalUnits > 0 ? percent((occupiedUnits / totalUnits) * 100) : '—'}
          hint={properties.data ? t('portal.owner.unitsOccupied', { occupied: formatNumber(occupiedUnits), total: formatNumber(totalUnits) }) : undefined}
          onPress={() => router.push('/portal/owner/properties')}
        />
      </StatGrid>

      <Card>
        <CardHeader title={t('portal.owner.properties')} subtitle={properties.data ? t('list.totalCount', { total: formatNumber(list.length) }) : undefined} />
        {properties.isLoading ? (
          <LoadingState rows={2} />
        ) : list.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.owner.noProperties')}
          </Text>
        ) : (
          list.slice(0, 3).map((p) => (
            <SectionRow
              key={p.id}
              title={p.name}
              subtitle={t('portal.owner.propertyLine', { code: p.code, occupied: formatNumber(p.occupiedUnits), total: formatNumber(p.totalUnits), rate: percent(p.occupancyRate) })}
              onPress={() => router.push(propertyHref(p.id))}
            />
          ))
        )}
      </Card>

      <HomeLinks
        links={[
          { icon: 'bar-chart-outline', title: t('portal.owner.reports'), subtitle: t('portal.owner.reportsLink'), href: '/portal/owner/reports' },
          { icon: 'hammer-outline', title: t('portal.owner.maintenance'), subtitle: t('portal.owner.maintenanceLink'), href: '/portal/owner/maintenance' },
        ]}
      />
    </PortalHomeScaffold>
  )
}

/** The owner's properties (`GET /portal/owner/properties` — one bounded list, not paged by the backend). */
export function OwnerPropertiesScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const properties = useOwnerProperties()
  const [refreshing, setRefreshing] = useState(false)
  const rows = properties.data ?? []

  async function onRefresh() {
    setRefreshing(true)
    await properties.refetch()
    setRefreshing(false)
  }

  return (
    <Screen scroll={false}>
      <FlatList<OwnerPropertyDto>
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="title">{t('portal.owner.properties')}</Text>
            {properties.data ? <LastUpdated updatedAt={properties.dataUpdatedAt} /> : null}
          </View>
        }
        ListEmptyComponent={
          properties.isLoading ? (
            <LoadingState rows={4} />
          ) : properties.isError ? (
            <ErrorState message={t('property.properties.loadError')} onRetry={() => properties.refetch()} />
          ) : (
            <EmptyState icon="business-outline" title={t('portal.owner.noProperties')} description={t('portal.owner.noPropertiesDescription')} />
          )
        }
        renderItem={({ item }) => (
          <RecordCard
            title={item.name}
            subtitle={item.code}
            meta={t('portal.owner.unitsOccupied', { occupied: formatNumber(item.occupiedUnits), total: formatNumber(item.totalUnits) })}
            amount={percent(item.occupancyRate)}
            onPress={() => router.push(propertyHref(item.id))}
          />
        )}
      />
    </Screen>
  )
}

export function OwnerPropertyDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const typeLabel = usePropertyTypeLabel()
  const property = useOwnerProperty(id)
  useTenantLocalization()

  return (
    <DetailScreen query={property} errorMessage={t('property.properties.loadError')}>
      {(p) => {
        const occupied = p.units.filter((u) => u.status === 'Occupied').length
        return (
          <>
            <Card>
              <View style={styles.titleRow}>
                <Text variant="heading" style={styles.flex}>
                  {p.name}
                </Text>
                <StatusBadge status={p.status} />
              </View>
              <DetailField label={t('portal.owner.code')} value={p.code} />
              <DetailField label={t('portal.owner.type')} value={typeLabel(p.type)} />
            </Card>
            <StatGrid>
              <StatCard label={t('portal.owner.units')} value={formatNumber(p.units.length)} />
              <StatCard label={t('portal.owner.occupied')} value={formatNumber(occupied)} hint={p.units.length > 0 ? percent((occupied / p.units.length) * 100) : undefined} />
            </StatGrid>
            <Card>
              <CardHeader title={t('portal.owner.units')} />
              {p.units.length === 0 ? (
                <Text variant="bodySmall" color="mutedForeground">
                  {t('portal.owner.noUnits')}
                </Text>
              ) : (
                p.units.map((u) => (
                  <SectionRow
                    key={u.id}
                    title={u.unitNumber}
                    subtitle={[u.tenantName ? t('facility.tenantValue', { name: u.tenantName }) : t('facility.noTenant'), u.marketRentRate != null ? t('portal.owner.marketRent', { amount: moneyExact(u.marketRentRate) }) : null]
                      .filter(Boolean)
                      .join(' · ')}
                    trailing={<StatusBadge status={u.status} />}
                  />
                ))
              )}
            </Card>
          </>
        )
      }}
    </DetailScreen>
  )
}

type Period = 'month' | 'year'

/** Rent collected, revenue and overdue rent across the owner's properties. "This month" sends no
 * range (the backend's default report range: the 1st of this month to today); "This year" sends
 * Jan 1 → today in the tenant's timezone. */
export function OwnerReportsScreen() {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('month')
  const today = tenantToday()
  const range = period === 'year' ? { from: `${today.slice(0, 4)}-01-01`, to: today } : {}
  const collected = useOwnerRentCollected(range)
  const revenue = useOwnerRevenue(range)
  const overdue = useOwnerOverdueRent()
  const [refreshing, setRefreshing] = useState(false)
  useTenantLocalization()

  const totalCollected = (collected.data ?? []).reduce((sum, row) => sum + row.amountCollected, 0)
  const revenueRows = revenue.data ?? []
  const totalRevenue = revenueRows.reduce((sum, row) => sum + row.revenue, 0)
  const overdueRows = overdue.data ?? []
  const totalOverdue = overdueRows.reduce((sum, row) => sum + row.outstandingAmount, 0)

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([collected.refetch(), revenue.refetch(), overdue.refetch()])
    setRefreshing(false)
  }

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <SegmentedControl<Period>
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: t('portal.owner.thisMonth') },
          { value: 'year', label: t('portal.owner.thisYear') },
        ]}
      />
      {collected.data ? <LastUpdated updatedAt={collected.dataUpdatedAt} /> : null}
      <StatGrid>
        <StatCard label={t('portal.owner.rentCollected')} value={collected.isLoading ? '…' : collected.isError ? '—' : money(totalCollected)} />
        <StatCard label={t('portal.owner.revenue')} value={revenue.isLoading ? '…' : revenue.isError ? '—' : money(totalRevenue)} />
        <StatCard label={t('portal.owner.overdueRent')} value={overdue.isLoading ? '…' : overdue.isError ? '—' : money(totalOverdue)} hint={t('portal.owner.asOfToday')} />
      </StatGrid>

      <Card>
        <CardHeader title={t('portal.owner.revenueByProperty')} />
        {revenue.isLoading ? (
          <LoadingState rows={2} />
        ) : revenue.isError ? (
          <ErrorState message={t('portal.owner.reportError')} onRetry={() => revenue.refetch()} />
        ) : revenueRows.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.owner.noRevenue')}
          </Text>
        ) : (
          revenueRows.map((row) => (
            <SectionRow
              key={row.propertyId}
              title={row.propertyName}
              trailing={
                <Text variant="bodySmall" style={styles.amount}>
                  {moneyExact(row.revenue)}
                </Text>
              }
            />
          ))
        )}
      </Card>

      <Card>
        <CardHeader title={t('portal.owner.overdueRent')} subtitle={overdue.data ? t('portal.owner.overdueLeases', { count: formatNumber(overdueRows.length) }) : undefined} />
        {overdue.isLoading ? (
          <LoadingState rows={2} />
        ) : overdue.isError ? (
          <ErrorState message={t('portal.owner.reportError')} onRetry={() => overdue.refetch()} />
        ) : overdueRows.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.owner.noOverdue')}
          </Text>
        ) : (
          overdueRows.map((row) => (
            <SectionRow
              key={`${row.leaseId}-${row.dueDate}`}
              title={`${row.leaseNumber} · ${row.tenantName}`}
              subtitle={t('portal.owner.overdueLine', { property: row.propertyName, due: formatDay(row.dueDate), days: formatNumber(row.daysPastDue) })}
              trailing={
                <Text variant="bodySmall" color="destructive" style={styles.amount}>
                  {moneyExact(row.outstandingAmount)}
                </Text>
              }
            />
          ))
        )}
      </Card>
    </Screen>
  )
}

/** Maintenance requests on the owner's properties (server-paged), read-only. */
export function OwnerMaintenanceScreen() {
  const { t } = useI18n()
  const requests = useOwnerMaintenanceRequests()
  const [selected, setSelected] = useState<MaintenanceRequestDto | null>(null)
  return (
    <Screen scroll={false} edges={[]}>
      <PagedList<MaintenanceRequestDto>
        query={requests}
        keyExtractor={(m) => m.id}
        emptyIcon="hammer-outline"
        emptyTitle={t('portal.owner.noMaintenance')}
        errorMessage={t('property.maintenance.loadError')}
        renderItem={(m) => <MaintenanceRequestCard request={m} onPress={() => setSelected(m)} />}
      />
      <MaintenanceRequestSheet request={selected} onClose={() => setSelected(null)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amount: { fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
})
