import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Card, DetailField, DetailScreen, LinkField, PagedList, PagedSection, RecordCard, Screen, SearchField, SectionRow, StatCard, StatusBadge, StatusFilter, Text } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { ModuleHubScreen } from '@/features/work/ModuleHubScreen'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel, useStatusLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import {
  BookingResourceTypeLabel,
  CoworkingBookingStatusLabel,
  FacilityOperatingStatusLabel,
  FacilityTypeLabel,
  LeaseStatusLabel,
  MaintenancePriorityLabel,
  MaintenanceStatusLabel,
  ServiceRequestCategoryLabel,
  SpaceStatusLabel,
  SpaceTypeLabel,
  type CoworkingBookingStatus,
  type FacilityOperatingStatus,
  type MaintenanceStatus,
  type SpaceStatus,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import {
  useCoworkingBooking,
  useCoworkingBookings,
  useFacilities,
  useFacilityRecord,
  useMallShop,
  useMallShops,
  useServiceRequest,
  useServiceRequests,
  useSpace,
  useSpaces,
} from './api'

export function FacilityHubScreen() {
  return (
    <ModuleHubScreen
      titleKey="module.facility"
      descriptionKey="module.facility.description"
      sections={[
        { key: 'serviceRequests', labelKey: 'facility.serviceRequests.title', descriptionKey: 'facility.serviceRequests.description', icon: 'build-outline', href: '/facility/service-requests', permission: 'facility.view' },
        { key: 'spaces', labelKey: 'facility.spaces.title', descriptionKey: 'facility.spaces.description', icon: 'grid-outline', href: '/facility/spaces', permission: 'facility.view' },
        { key: 'facilities', labelKey: 'facility.facilities.title', descriptionKey: 'facility.facilities.description', icon: 'storefront-outline', href: '/facility/facilities', permission: 'facility.view' },
        { key: 'mallShops', labelKey: 'facility.mallShops.title', descriptionKey: 'facility.mallShops.description', icon: 'bag-handle-outline', href: '/facility/mall-shops', permission: 'facility.view' },
        { key: 'coworkingBookings', labelKey: 'facility.coworkingBookings.title', descriptionKey: 'facility.coworkingBookings.description', icon: 'calendar-outline', href: '/facility/coworking-bookings', permission: 'facility.view' },
      ]}
    />
  )
}

// --- Facilities ---

export function FacilitiesListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FacilityOperatingStatus | undefined>()
  const facilities = useFacilities({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={facilities}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('facility.facilities.search')} />
            <StatusFilter labels={FacilityOperatingStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(f) => f.id}
        emptyIcon="storefront-outline"
        emptyTitle={t('facility.facilities.empty')}
        errorMessage={t('facility.facilities.loadError')}
        renderItem={(f) => (
          <RecordCard
            title={f.name}
            subtitle={`${f.code} · ${enumLabel(FacilityTypeLabel, f.type)}`}
            meta={`${f.propertyName} · ${t('facility.spaceCount', { count: formatNumber(f.spaceCount) })}`}
            badge={<StatusBadge status={f.status} labels={FacilityOperatingStatusLabel} />}
            onPress={() => router.push({ pathname: '/facility/facilities/[id]', params: { id: f.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function FacilityDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const facility = useFacilityRecord(id)
  const spaces = useSpaces({ facilityId: id })
  const requests = useServiceRequests({ facilityId: id })
  const canViewProperty = usePermission('property.view')

  return (
    <DetailScreen query={facility} errorMessage={t('facility.facilities.loadError')} refetchAlso={[spaces, requests]}>
      {(f) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{f.name}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {f.code} · {enumLabel(FacilityTypeLabel, f.type)}
                </Text>
              </View>
              <StatusBadge status={f.status} labels={FacilityOperatingStatusLabel} />
            </View>
            {f.description ? <Text variant="body">{f.description}</Text> : null}
            {canViewProperty ? (
              <LinkField label={t('property.property')} value={f.propertyName} icon="business-outline" onPress={() => router.push({ pathname: '/property/properties/[id]', params: { id: f.propertyId } })} />
            ) : (
              <DetailField label={t('property.property')} value={f.propertyName} />
            )}
            <DetailField label={t('detail.address')} value={[f.addressLine, f.city].filter(Boolean).join(', ')} />
            <DetailField label={t('facility.manager')} value={f.managerUserName} />
          </Card>

          <PagedSection
            title={t('facility.serviceRequests.title')}
            query={requests}
            keyExtractor={(r) => r.id}
            emptyText={t('facility.serviceRequests.empty')}
            errorMessage={t('facility.serviceRequests.loadError')}
            renderItem={(r) => (
              <SectionRow
                title={`${r.requestNumber}${r.spaceCode ? ` · ${r.spaceCode}` : ''}`}
                subtitle={r.description}
                trailing={<StatusBadge status={r.status} labels={MaintenanceStatusLabel} />}
                onPress={() => router.push({ pathname: '/facility/service-requests/[id]', params: { id: r.id } })}
              />
            )}
          />

          <PagedSection
            title={t('facility.spaces.title')}
            query={spaces}
            keyExtractor={(s) => s.id}
            emptyText={t('facility.spaces.empty')}
            errorMessage={t('facility.spaces.loadError')}
            renderItem={(s) => (
              <SectionRow
                title={[s.buildingBlock, s.code].filter(Boolean).join(' · ')}
                subtitle={enumLabel(SpaceTypeLabel, s.type)}
                trailing={<StatusBadge status={s.status} labels={SpaceStatusLabel} />}
                onPress={() => router.push({ pathname: '/facility/spaces/[id]', params: { id: s.id } })}
              />
            )}
          />

          <DocumentsPanel entityType="Facility" entityId={f.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Spaces ---

export function SpacesListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SpaceStatus | undefined>()
  const spaces = useSpaces({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={spaces}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('facility.spaces.search')} />
            <StatusFilter labels={SpaceStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(s) => s.id}
        emptyIcon="grid-outline"
        emptyTitle={t('facility.spaces.empty')}
        errorMessage={t('facility.spaces.loadError')}
        renderItem={(s) => (
          <RecordCard
            title={`${s.facilityName} · ${[s.buildingBlock, s.code].filter(Boolean).join(' ')}`}
            subtitle={`${enumLabel(SpaceTypeLabel, s.type)}${s.capacity != null ? ` · ${t('facility.capacityValue', { count: formatNumber(s.capacity) })}` : ''}`}
            badge={<StatusBadge status={s.status} labels={SpaceStatusLabel} />}
            amount={s.rate != null ? money(s.rate) : null}
            onPress={() => router.push({ pathname: '/facility/spaces/[id]', params: { id: s.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function SpaceDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const space = useSpace(id)
  const requests = useServiceRequests({ spaceId: id })

  return (
    <DetailScreen query={space} errorMessage={t('facility.spaces.loadError')} refetchAlso={[requests]}>
      {(s) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{[s.buildingBlock, s.code].filter(Boolean).join(' · ')}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {enumLabel(SpaceTypeLabel, s.type)}
                </Text>
              </View>
              <StatusBadge status={s.status} labels={SpaceStatusLabel} />
            </View>
            <LinkField label={t('facility.facility')} value={s.facilityName} icon="storefront-outline" onPress={() => router.push({ pathname: '/facility/facilities/[id]', params: { id: s.facilityId } })} />
            <DetailField label={t('property.area')} value={s.areaSize != null ? formatNumber(s.areaSize) : null} />
            <DetailField label={t('facility.capacity')} value={s.capacity != null ? formatNumber(s.capacity) : null} />
            <DetailField label={t('facility.rate')} value={s.rate != null ? moneyExact(s.rate) : null} />
          </Card>
          <PagedSection
            title={t('facility.serviceRequests.title')}
            query={requests}
            keyExtractor={(r) => r.id}
            emptyText={t('facility.serviceRequests.empty')}
            errorMessage={t('facility.serviceRequests.loadError')}
            renderItem={(r) => (
              <SectionRow
                title={r.requestNumber}
                subtitle={r.description}
                trailing={<StatusBadge status={r.status} labels={MaintenanceStatusLabel} />}
                onPress={() => router.push({ pathname: '/facility/service-requests/[id]', params: { id: r.id } })}
              />
            )}
          />
        </>
      )}
    </DetailScreen>
  )
}

// --- Service requests ---

export function ServiceRequestsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<MaintenanceStatus | undefined>()
  const requests = useServiceRequests({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={requests}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('facility.serviceRequests.search')} />
            <StatusFilter labels={MaintenanceStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(r) => r.id}
        emptyIcon="build-outline"
        emptyTitle={t('facility.serviceRequests.empty')}
        errorMessage={t('facility.serviceRequests.loadError')}
        renderItem={(r) => (
          <RecordCard
            title={`${r.requestNumber} · ${r.facilityName}${r.spaceCode ? ` · ${r.spaceCode}` : ''}`}
            subtitle={r.description}
            meta={`${enumLabel(ServiceRequestCategoryLabel, r.category)} · ${t('property.priorityValue', { priority: enumLabel(MaintenancePriorityLabel, r.priority) })} · ${formatDay(r.reportedDate)}`}
            badge={<StatusBadge status={r.status} labels={MaintenanceStatusLabel} />}
            onPress={() => router.push({ pathname: '/facility/service-requests/[id]', params: { id: r.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function ServiceRequestDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const request = useServiceRequest(id)

  return (
    <DetailScreen query={request} errorMessage={t('facility.serviceRequests.loadError')}>
      {(r) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {r.requestNumber}
              </Text>
              <StatusBadge status={r.status} labels={MaintenanceStatusLabel} />
            </View>
            <Text variant="body">{r.description}</Text>
          </Card>
          <Card>
            <LinkField label={t('facility.facility')} value={r.facilityName} icon="storefront-outline" onPress={() => router.push({ pathname: '/facility/facilities/[id]', params: { id: r.facilityId } })} />
            {r.spaceId ? (
              <LinkField label={t('facility.space')} value={r.spaceCode ?? '—'} icon="grid-outline" onPress={() => router.push({ pathname: '/facility/spaces/[id]', params: { id: r.spaceId! } })} />
            ) : null}
            <DetailField label={t('property.category')} value={enumLabel(ServiceRequestCategoryLabel, r.category)} />
            <DetailField label={t('property.priority')} value={enumLabel(MaintenancePriorityLabel, r.priority)} />
            <DetailField label={t('property.reportedDate')} value={formatDay(r.reportedDate)} />
            <DetailField label={t('facility.requestedBy')} value={r.requestedByUserName ?? r.requesterCustomerName} />
            <DetailField label={t('property.assignedTo')} value={[r.assignedToUserName, r.assignedVendorName].filter(Boolean).join(' · ') || t('crm.unassigned')} />
            {r.resolvedDate ? <DetailField label={t('facility.resolvedDate')} value={formatDay(r.resolvedDate)} /> : null}
            {r.resolutionNotes ? <DetailField label={t('property.resolutionNotes')} value={r.resolutionNotes} /> : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(r.createdAt)} />
          </Card>
        </>
      )}
    </DetailScreen>
  )
}

// --- Mall shops ---

export function MallShopsListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SpaceStatus | undefined>()
  const shops = useMallShops({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={shops}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('facility.mallShops.search')} />
            <StatusFilter labels={SpaceStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(s) => s.spaceId}
        emptyIcon="bag-handle-outline"
        emptyTitle={t('facility.mallShops.empty')}
        errorMessage={t('facility.mallShops.loadError')}
        renderItem={(s) => (
          <RecordCard
            title={`${s.code}${s.storefrontName ? ` · ${s.storefrontName}` : ''}`}
            subtitle={[s.facilityName, s.tradeCategory].filter(Boolean).join(' · ')}
            meta={s.currentTenantName ? t('facility.tenantValue', { name: s.currentTenantName }) : t('facility.noTenant')}
            badge={<StatusBadge status={s.status} labels={SpaceStatusLabel} />}
            amount={s.rate != null ? money(s.rate) : null}
            onPress={() => router.push({ pathname: '/facility/mall-shops/[id]', params: { id: s.spaceId } })}
          />
        )}
      />
    </Screen>
  )
}

export function MallShopDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const statusLabel = useStatusLabel()
  const shop = useMallShop(id)
  const canViewProperty = usePermission('property.view')

  return (
    <DetailScreen query={shop} errorMessage={t('facility.mallShops.loadError')}>
      {(s) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{s.storefrontName ?? s.code}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {[s.buildingBlock, s.code].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <StatusBadge status={s.status} labels={SpaceStatusLabel} />
            </View>
            <LinkField label={t('facility.facility')} value={s.facilityName} icon="storefront-outline" onPress={() => router.push({ pathname: '/facility/facilities/[id]', params: { id: s.facilityId } })} />
            <DetailField label={t('facility.tradeCategory')} value={s.tradeCategory} />
            <DetailField label={t('property.area')} value={s.areaSize != null ? formatNumber(s.areaSize) : null} />
            <DetailField label={t('facility.rate')} value={s.rate != null ? moneyExact(s.rate) : null} />
            {s.notes ? <DetailField label={t('detail.notes')} value={s.notes} /> : null}
          </Card>
          <Card>
            <DetailField label={t('facility.currentTenant')} value={s.currentTenantName ?? t('facility.noTenant')} />
            {s.currentLeaseId ? (
              canViewProperty ? (
                <LinkField
                  label={t('facility.currentLease')}
                  value={s.currentLeaseStatus != null ? statusLabel(LeaseStatusLabel, s.currentLeaseStatus) : t('facility.viewLease')}
                  icon="document-text-outline"
                  onPress={() => router.push({ pathname: '/property/leases/[id]', params: { id: s.currentLeaseId! } })}
                />
              ) : (
                <DetailField label={t('facility.currentLease')} value={s.currentLeaseStatus != null ? <StatusBadge status={s.currentLeaseStatus} labels={LeaseStatusLabel} /> : null} />
              )
            ) : null}
          </Card>
        </>
      )}
    </DetailScreen>
  )
}

// --- Coworking bookings ---

export function CoworkingBookingsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [status, setStatus] = useState<CoworkingBookingStatus | undefined>()
  const bookings = useCoworkingBookings({ status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={bookings}
        header={<StatusFilter labels={CoworkingBookingStatusLabel} value={status} onChange={setStatus} />}
        keyExtractor={(b) => b.id}
        emptyIcon="calendar-outline"
        emptyTitle={t('facility.coworkingBookings.empty')}
        errorMessage={t('facility.coworkingBookings.loadError')}
        renderItem={(b) => (
          <RecordCard
            title={`${b.memberName} · ${b.resourceLabel}`}
            subtitle={enumLabel(BookingResourceTypeLabel, b.resourceType)}
            meta={`${formatDateTime(b.startAt)} → ${formatDateTime(b.endAt)}`}
            badge={<StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />}
            amount={money(b.price)}
            onPress={() => router.push({ pathname: '/facility/coworking-bookings/[id]', params: { id: b.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function CoworkingBookingDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const booking = useCoworkingBooking(id)

  return (
    <DetailScreen query={booking} errorMessage={t('facility.coworkingBookings.loadError')}>
      {(b) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{b.resourceLabel}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {enumLabel(BookingResourceTypeLabel, b.resourceType)}
                </Text>
              </View>
              <StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />
            </View>
            <DetailField label={t('facility.member')} value={b.memberName} />
            <DetailField label={t('facility.starts')} value={formatDateTime(b.startAt)} />
            <DetailField label={t('facility.ends')} value={formatDateTime(b.endAt)} />
            {b.notes ? <DetailField label={t('detail.notes')} value={b.notes} /> : null}
          </Card>
          <View style={styles.stats}>
            <StatCard label={t('facility.price')} value={moneyExact(b.price)} />
            <StatCard label={t('facility.paid')} value={moneyExact(b.paidAmount)} />
          </View>
        </>
      )}
    </DetailScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
