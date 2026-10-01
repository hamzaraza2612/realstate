import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useApiGet, usePagedList } from '@/api/paging'
import {
  Card,
  CardHeader,
  ContactButtons,
  ContactField,
  DetailField,
  DetailScreen,
  LinkField,
  PagedList,
  RecordCard,
  Screen,
  SearchField,
  SectionRow,
  StatCard,
  StatusBadge,
  StatusFilter,
  Text,
} from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { ModuleHubScreen } from '@/features/work/ModuleHubScreen'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import {
  PurchaseOrderStatusLabel,
  PurchasePriorityLabel,
  PurchaseRequestStatusLabel,
  type PurchaseOrderDto,
  type PurchaseOrderStatus,
  type PurchaseRequestDto,
  type PurchaseRequestStatus,
  type VendorDto,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, moneyExact } from '@/utils/format'

/**
 * Procurement — the web `modules/procurement` endpoints (all `procurement.view`):
 *   GET /procurement/purchase-orders?search=&status=&page=&pageSize=, GET /procurement/purchase-orders/{id}
 *   GET /procurement/purchase-requests?search=&status=&page=&pageSize=, GET /procurement/purchase-requests/{id}
 *   GET /procurement/vendors?search=&page=&pageSize=, GET /procurement/vendors/{id}
 * PO approval is decided through the Approvals inbox (the existing generic approval request).
 */

const PROCUREMENT_KEY = ['procurement']

export function ProcurementHubScreen() {
  return (
    <ModuleHubScreen
      titleKey="module.procurement"
      descriptionKey="module.procurement.description"
      sections={[
        { key: 'orders', labelKey: 'procurement.orders.title', descriptionKey: 'procurement.orders.description', icon: 'cart-outline', href: '/procurement/purchase-orders', permission: 'procurement.view' },
        { key: 'requests', labelKey: 'procurement.requests.title', descriptionKey: 'procurement.requests.description', icon: 'clipboard-outline', href: '/procurement/purchase-requests', permission: 'procurement.view' },
        { key: 'vendors', labelKey: 'procurement.vendors.title', descriptionKey: 'procurement.vendors.description', icon: 'business-outline', href: '/procurement/vendors', permission: 'procurement.view' },
      ]}
    />
  )
}

// --- Purchase orders ---

export function PurchaseOrdersListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>()
  const orders = usePagedList<PurchaseOrderDto>([...PROCUREMENT_KEY, 'purchase-orders'], '/procurement/purchase-orders', { search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={orders}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('procurement.orders.search')} />
            <StatusFilter labels={PurchaseOrderStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(po) => po.id}
        emptyIcon="cart-outline"
        emptyTitle={t('procurement.orders.empty')}
        errorMessage={t('procurement.orders.loadError')}
        renderItem={(po) => (
          <RecordCard
            title={`${po.poNumber} · ${po.vendorName}`}
            subtitle={po.projectName}
            meta={formatDay(po.orderDate)}
            badge={<StatusBadge status={po.status} labels={PurchaseOrderStatusLabel} />}
            amount={money(po.total)}
            onPress={() => router.push({ pathname: '/procurement/purchase-orders/[id]', params: { id: po.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One purchase order with its lines and received/outstanding quantities — what a site
 * supervisor checks when a delivery arrives — plus attached documents (e.g. a delivery note photo). */
export function PurchaseOrderDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const order = useApiGet<PurchaseOrderDto>([...PROCUREMENT_KEY, 'purchase-orders', 'detail', id], `/procurement/purchase-orders/${id}`)

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
            <LinkField label={t('procurement.vendor')} value={po.vendorName} icon="business-outline" onPress={() => router.push({ pathname: '/procurement/vendors/[id]', params: { id: po.vendorId } })} />
            <DetailField label={t('procurement.project')} value={po.projectName} />
            {po.workPackageName ? <DetailField label={t('construction.workPackage')} value={po.workPackageName} /> : null}
            {po.purchaseRequestId ? (
              <LinkField
                label={t('procurement.purchaseRequest')}
                value={po.purchaseRequestNumber ?? '—'}
                icon="clipboard-outline"
                onPress={() => router.push({ pathname: '/procurement/purchase-requests/[id]', params: { id: po.purchaseRequestId! } })}
              />
            ) : null}
            <DetailField label={t('procurement.orderDate')} value={formatDay(po.orderDate)} />
            <DetailField label={t('procurement.expectedDelivery')} value={formatDay(po.expectedDeliveryDate)} />
            {po.notes ? <DetailField label={t('detail.notes')} value={po.notes} /> : null}
          </Card>

          <View style={styles.stats}>
            <StatCard label={t('procurement.subtotal')} value={moneyExact(po.subtotal)} />
            <StatCard label={t('procurement.discount')} value={moneyExact(po.discount)} />
            <StatCard label={t('procurement.tax')} value={moneyExact(po.taxAmount)} />
            <StatCard label={t('procurement.total')} value={moneyExact(po.total)} />
          </View>

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

          <DocumentsPanel entityType="PurchaseOrder" entityId={po.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Purchase requests ---

export function PurchaseRequestsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PurchaseRequestStatus | undefined>()
  const requests = usePagedList<PurchaseRequestDto>([...PROCUREMENT_KEY, 'purchase-requests'], '/procurement/purchase-requests', { search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={requests}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('procurement.requests.search')} />
            <StatusFilter labels={PurchaseRequestStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(pr) => pr.id}
        emptyIcon="clipboard-outline"
        emptyTitle={t('procurement.requests.empty')}
        errorMessage={t('procurement.requests.loadError')}
        renderItem={(pr) => (
          <RecordCard
            title={`${pr.requestNumber} · ${pr.projectName}`}
            subtitle={[pr.requestedByUserName, t('procurement.priorityValue', { priority: enumLabel(PurchasePriorityLabel, pr.priority) })].filter(Boolean).join(' · ')}
            meta={pr.requiredDate ? t('procurement.requiredBy', { date: formatDay(pr.requiredDate) }) : null}
            badge={<StatusBadge status={pr.status} labels={PurchaseRequestStatusLabel} />}
            amount={money(pr.estimatedTotal)}
            onPress={() => router.push({ pathname: '/procurement/purchase-requests/[id]', params: { id: pr.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function PurchaseRequestDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const request = useApiGet<PurchaseRequestDto>([...PROCUREMENT_KEY, 'purchase-requests', 'detail', id], `/procurement/purchase-requests/${id}`)

  return (
    <DetailScreen query={request} errorMessage={t('procurement.requests.loadError')}>
      {(pr) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {pr.requestNumber}
              </Text>
              <StatusBadge status={pr.status} labels={PurchaseRequestStatusLabel} />
            </View>
            <DetailField label={t('procurement.project')} value={pr.projectName} />
            {pr.workPackageName ? <DetailField label={t('construction.workPackage')} value={pr.workPackageName} /> : null}
            <DetailField label={t('procurement.requestedBy')} value={pr.requestedByUserName} />
            <DetailField label={t('procurement.priority')} value={enumLabel(PurchasePriorityLabel, pr.priority)} />
            <DetailField label={t('procurement.requiredDate')} value={formatDay(pr.requiredDate)} />
            <DetailField label={t('procurement.estimatedTotal')} value={moneyExact(pr.estimatedTotal)} />
            {pr.notes ? <DetailField label={t('detail.notes')} value={pr.notes} /> : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(pr.createdAt)} />
          </Card>

          <Card>
            <CardHeader title={t('procurement.lines')} subtitle={t('list.totalCount', { total: formatNumber(pr.lines.length) })} />
            {pr.lines.map((line) => (
              <SectionRow
                key={line.id}
                title={line.itemDescription}
                subtitle={t('procurement.requestLine', { qty: formatNumber(line.quantity), uom: line.unitOfMeasure, price: moneyExact(line.estimatedUnitPrice) })}
                trailing={
                  <Text variant="bodySmall" style={styles.amount}>
                    {moneyExact(line.estimatedTotal)}
                  </Text>
                }
              />
            ))}
          </Card>

          <DocumentsPanel entityType="PurchaseRequest" entityId={pr.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Vendors ---

export function VendorsListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const vendors = usePagedList<VendorDto>([...PROCUREMENT_KEY, 'vendors'], '/procurement/vendors', { search })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={vendors}
        header={<SearchField onSearch={setSearch} placeholder={t('procurement.vendors.search')} />}
        keyExtractor={(vendor) => vendor.id}
        emptyIcon="business-outline"
        emptyTitle={t('procurement.vendors.empty')}
        errorMessage={t('procurement.vendors.loadError')}
        renderItem={(vendor) => (
          <RecordCard
            title={vendor.name}
            subtitle={[vendor.contactPerson, vendor.phone ?? vendor.email].filter(Boolean).join(' · ') || null}
            badge={<StatusBadge status={vendor.isActive ? 'Active' : 'Inactive'} />}
            onPress={() => router.push({ pathname: '/procurement/vendors/[id]', params: { id: vendor.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function VendorDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const vendor = useApiGet<VendorDto>([...PROCUREMENT_KEY, 'vendors', 'detail', id], `/procurement/vendors/${id}`)

  return (
    <DetailScreen query={vendor} errorMessage={t('procurement.vendors.loadError')}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {item.name}
              </Text>
              <StatusBadge status={item.isActive ? 'Active' : 'Inactive'} />
            </View>
            <ContactButtons phone={item.phone} email={item.email} />
          </Card>
          <Card>
            <DetailField label={t('procurement.contactPerson')} value={item.contactPerson} />
            <ContactField kind="phone" label={t('crm.phone')} value={item.phone} />
            <ContactField kind="email" label={t('crm.email')} value={item.email} />
            <DetailField label={t('crm.address')} value={item.address} />
            <DetailField label={t('procurement.taxNumber')} value={item.taxRegistrationNumber} mono />
            {item.notes ? <DetailField label={t('detail.notes')} value={item.notes} /> : null}
          </Card>
          <DocumentsPanel entityType="Vendor" entityId={item.id} />
        </>
      )}
    </DetailScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { fontWeight: '600' },
})
