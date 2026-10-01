import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { flattenPages, pagedTotal } from '@/api/pagedQuery'
import { Card, CardHeader, DetailField, DetailScreen, ErrorState, LoadingState, PagedList, RecordCard, SectionRow, StatCard, StatusBadge, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing } from '@/theme'
import { MaintenanceStatus, PurchaseOrderStatus, PurchaseOrderStatusLabel, type MaintenanceRequestDto, type PurchaseOrderDto } from '@/types/modules'
import { formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import { HOME_SAMPLE_SIZE, useVendorAssignedWork, useVendorPurchaseOrder, useVendorPurchaseOrders } from '../api/resources'
import { MaintenanceRequestCard, MaintenanceRequestSheet } from '../components/MaintenanceRequestViews'
import { HomeLinks, PortalHomeScaffold, StatGrid } from '../components/PortalHome'

/**
 * Vendor portal (`/portal/vendor`) — read-only, matching the backend (no PO acceptance/negotiation
 * workflow exists in the domain, so none is offered): the vendor's purchase orders with their lines,
 * the maintenance work assigned to them, documents and notifications.
 */

const orderHref = (id: string) => ({ pathname: '/portal/vendor/order/[id]' as const, params: { id } })

/** Issued to the vendor and not yet fully delivered. */
function isOpenOrder(po: PurchaseOrderDto) {
  return po.status === PurchaseOrderStatus.Approved || po.status === PurchaseOrderStatus.Sent || po.status === PurchaseOrderStatus.PartiallyReceived
}

function isOpenWork(request: MaintenanceRequestDto) {
  return request.status !== MaintenanceStatus.Resolved && request.status !== MaintenanceStatus.Cancelled
}

export function VendorHomeScreen() {
  const { t } = useI18n()
  const orders = useVendorPurchaseOrders({ pageSize: HOME_SAMPLE_SIZE })
  const work = useVendorAssignedWork({ pageSize: HOME_SAMPLE_SIZE })
  const orderItems = flattenPages(orders.data)
  const openOrders = orderItems.filter(isOpenOrder)
  const openOrderValue = openOrders.reduce((sum, po) => sum + po.total, 0)
  const openWork = flattenPages(work.data).filter(isOpenWork).length

  return (
    <PortalHomeScaffold refetch={() => Promise.all([orders.refetch(), work.refetch()])}>
      {orders.isError ? <ErrorState message={t('portal.home.loadError')} onRetry={() => orders.refetch()} /> : null}
      <StatGrid>
        <StatCard
          icon="cart-outline"
          label={t('portal.vendor.openOrders')}
          value={orders.isLoading ? '…' : formatNumber(openOrders.length)}
          hint={orders.data ? t('portal.vendor.openOrdersValue', { amount: money(openOrderValue) }) : undefined}
          onPress={() => router.push('/portal/vendor/orders')}
        />
        <StatCard
          icon="documents-outline"
          label={t('portal.vendor.allOrders')}
          value={orders.isLoading ? '…' : formatNumber(pagedTotal(orders.data) ?? 0)}
          onPress={() => router.push('/portal/vendor/orders')}
        />
        <StatCard
          icon="hammer-outline"
          label={t('portal.vendor.openWork')}
          value={work.isLoading ? '…' : work.isError ? '—' : formatNumber(openWork)}
          hint={work.data ? t('list.totalCount', { total: formatNumber(pagedTotal(work.data) ?? 0) }) : undefined}
          onPress={() => router.push('/portal/vendor/work')}
        />
      </StatGrid>

      <Card>
        <CardHeader title={t('portal.vendor.recentOrders')} />
        {orders.isLoading ? (
          <LoadingState rows={2} />
        ) : orderItems.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.vendor.noOrders')}
          </Text>
        ) : (
          orderItems.slice(0, 3).map((po) => (
            <SectionRow
              key={po.id}
              title={`${po.poNumber} · ${moneyExact(po.total)}`}
              subtitle={`${po.projectName} · ${formatDay(po.orderDate)}`}
              trailing={<StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />}
              onPress={() => router.push(orderHref(po.id))}
            />
          ))
        )}
      </Card>

      <HomeLinks links={[{ icon: 'hammer-outline', title: t('portal.vendor.assignedWork'), subtitle: t('portal.vendor.assignedWorkLink'), href: '/portal/vendor/work' }]} />
    </PortalHomeScaffold>
  )
}

export function VendorOrdersScreen() {
  const { t } = useI18n()
  const orders = useVendorPurchaseOrders()
  useTenantLocalization()
  return (
    <Screen scroll={false}>
      <PagedList<PurchaseOrderDto>
        query={orders}
        header={<Text variant="title">{t('procurement.orders.title')}</Text>}
        keyExtractor={(po) => po.id}
        emptyIcon="cart-outline"
        emptyTitle={t('portal.vendor.noOrders')}
        errorMessage={t('procurement.orders.loadError')}
        renderItem={(po) => (
          <RecordCard
            title={po.poNumber}
            subtitle={po.projectName}
            meta={[t('portal.vendor.orderedOn', { date: formatDay(po.orderDate) }), po.expectedDeliveryDate ? t('portal.vendor.deliverBy', { date: formatDay(po.expectedDeliveryDate) }) : null]
              .filter(Boolean)
              .join(' · ')}
            badge={<StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />}
            amount={money(po.total)}
            onPress={() => router.push(orderHref(po.id))}
          />
        )}
      />
    </Screen>
  )
}

/** One purchase order: dates, the lines ordered (with received / outstanding quantities) and totals. */
export function VendorOrderDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const order = useVendorPurchaseOrder(id)
  return (
    <DetailScreen query={order} errorMessage={t('procurement.orders.loadError')}>
      {(po) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {po.poNumber}
              </Text>
              <StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />
            </View>
            <DetailField label={t('procurement.project')} value={po.projectName} />
            {po.workPackageName ? <DetailField label={t('construction.workPackage')} value={po.workPackageName} /> : null}
            <DetailField label={t('procurement.orderDate')} value={formatDay(po.orderDate)} />
            <DetailField label={t('procurement.expectedDelivery')} value={formatDay(po.expectedDeliveryDate)} />
            {po.notes ? <DetailField label={t('detail.notes')} value={po.notes} /> : null}
          </Card>

          <StatGrid>
            <StatCard label={t('procurement.subtotal')} value={moneyExact(po.subtotal)} />
            <StatCard label={t('procurement.tax')} value={moneyExact(po.taxAmount)} />
            <StatCard label={t('procurement.total')} value={moneyExact(po.total)} hint={po.discount > 0 ? `${t('procurement.discount')}: ${moneyExact(po.discount)}` : undefined} />
          </StatGrid>

          <Card>
            <CardHeader title={t('procurement.lines')} subtitle={t('list.totalCount', { total: formatNumber(po.lines.length) })} />
            {po.lines.map((line) => (
              <SectionRow
                key={line.id}
                title={line.itemDescription}
                subtitle={t('procurement.orderLine', {
                  qty: formatNumber(line.quantity),
                  uom: line.unitOfMeasure,
                  price: moneyExact(line.unitPrice),
                  received: formatNumber(line.receivedQuantity),
                  outstanding: formatNumber(line.outstandingQuantity),
                })}
                trailing={
                  <Text variant="bodySmall" style={styles.amount}>
                    {moneyExact(line.total)}
                  </Text>
                }
              />
            ))}
          </Card>
        </>
      )}
    </DetailScreen>
  )
}

/** Maintenance work assigned to this vendor (server-paged), read-only. */
export function VendorWorkScreen() {
  const { t } = useI18n()
  const work = useVendorAssignedWork()
  const [selected, setSelected] = useState<MaintenanceRequestDto | null>(null)
  return (
    <Screen scroll={false} edges={[]}>
      <PagedList<MaintenanceRequestDto>
        query={work}
        keyExtractor={(m) => m.id}
        emptyIcon="hammer-outline"
        emptyTitle={t('portal.vendor.noWork')}
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
})
