import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import {
  Card,
  ContactButtons,
  ContactField,
  DetailField,
  DetailScreen,
  LinkField,
  PagedList,
  PagedSection,
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
  LeaseStatusLabel,
  MaintenanceStatusLabel,
  PropertyStatusLabel,
  PropertyTypeLabel,
  PropertyUnitStatusLabel,
  PropertyUnitTypeLabel,
  type PropertyStatus,
  type PropertyUnitStatus,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money } from '@/utils/format'
import { useLeases, useMaintenanceRequests, useProperties, usePropertyRecord, useRentalTenant, useRentalTenants, useUnit, useUnits } from './api'

/** Property hub — ordered for a property manager on site: units and leases first, then
 * maintenance, then the property and tenant registers. Every area is `property.view` on web. */
export function PropertyHubScreen() {
  return (
    <ModuleHubScreen
      titleKey="module.property"
      descriptionKey="module.property.description"
      sections={[
        { key: 'units', labelKey: 'property.units.title', descriptionKey: 'property.units.description', icon: 'grid-outline', href: '/property/units', permission: 'property.view' },
        { key: 'leases', labelKey: 'property.leases.title', descriptionKey: 'property.leases.description', icon: 'document-text-outline', href: '/property/leases', permission: 'property.view' },
        { key: 'maintenance', labelKey: 'property.maintenance.title', descriptionKey: 'property.maintenance.description', icon: 'hammer-outline', href: '/property/maintenance', permission: 'property.view' },
        { key: 'properties', labelKey: 'property.properties.title', descriptionKey: 'property.properties.description', icon: 'business-outline', href: '/property/properties', permission: 'property.view' },
        { key: 'tenants', labelKey: 'property.tenants.title', descriptionKey: 'property.tenants.description', icon: 'people-outline', href: '/property/tenants', permission: 'property.view' },
      ]}
    />
  )
}

// --- Properties ---

export function PropertiesListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PropertyStatus | undefined>()
  const properties = useProperties({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={properties}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('property.properties.search')} />
            <StatusFilter labels={PropertyStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(p) => p.id}
        emptyIcon="business-outline"
        emptyTitle={t('property.properties.empty')}
        errorMessage={t('property.properties.loadError')}
        renderItem={(p) => (
          <RecordCard
            title={p.name}
            subtitle={`${p.code} · ${enumLabel(PropertyTypeLabel, p.type)}`}
            meta={[[p.city, p.country].filter(Boolean).join(', '), t('property.unitCount', { count: formatNumber(p.unitCount) })].filter(Boolean).join(' · ')}
            badge={<StatusBadge status={p.status} labels={PropertyStatusLabel} />}
            onPress={() => router.push({ pathname: '/property/properties/[id]', params: { id: p.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function PropertyDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const property = usePropertyRecord(id)
  const units = useUnits({ propertyId: id })
  const maintenance = useMaintenanceRequests({ propertyId: id })

  return (
    <DetailScreen query={property} errorMessage={t('property.properties.loadError')} refetchAlso={[units, maintenance]}>
      {(p) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{p.name}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {p.code} · {enumLabel(PropertyTypeLabel, p.type)}
                </Text>
              </View>
              <StatusBadge status={p.status} labels={PropertyStatusLabel} />
            </View>
            {p.description ? <Text variant="body">{p.description}</Text> : null}
            <DetailField label={t('detail.address')} value={[p.addressLine, p.city, p.state, p.country, p.postalCode].filter(Boolean).join(', ')} />
            <DetailField label={t('property.owner')} value={[p.ownerName, p.ownerContact].filter(Boolean).join(' · ')} />
          </Card>

          <PagedSection
            title={t('property.units.title')}
            query={units}
            keyExtractor={(u) => u.id}
            emptyText={t('property.units.empty')}
            errorMessage={t('property.units.loadError')}
            renderItem={(u) => (
              <SectionRow
                title={[u.buildingBlock, u.unitNumber].filter(Boolean).join(' · ')}
                subtitle={`${enumLabel(PropertyUnitTypeLabel, u.type)}${u.floor ? ` · ${t('property.floorValue', { floor: u.floor })}` : ''}`}
                trailing={<StatusBadge status={u.status} labels={PropertyUnitStatusLabel} />}
                onPress={() => router.push({ pathname: '/property/units/[id]', params: { id: u.id } })}
              />
            )}
          />

          <PagedSection
            title={t('property.maintenance.title')}
            query={maintenance}
            keyExtractor={(m) => m.id}
            emptyText={t('property.maintenance.empty')}
            errorMessage={t('property.maintenance.loadError')}
            renderItem={(m) => (
              <SectionRow
                title={`${m.requestNumber}${m.unitNumber ? ` · ${m.unitNumber}` : ''}`}
                subtitle={m.description}
                trailing={<StatusBadge status={m.status} labels={MaintenanceStatusLabel} />}
                onPress={() => router.push({ pathname: '/property/maintenance/[id]', params: { id: m.id } })}
              />
            )}
          />

          <DocumentsPanel entityType="Property" entityId={p.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Units ---

export function UnitsListScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<PropertyUnitStatus | undefined>()
  const units = useUnits({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={units}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('property.units.search')} />
            <StatusFilter labels={PropertyUnitStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(u) => u.id}
        emptyIcon="grid-outline"
        emptyTitle={t('property.units.empty')}
        errorMessage={t('property.units.loadError')}
        renderItem={(u) => (
          <RecordCard
            title={`${u.propertyName} · ${[u.buildingBlock, u.unitNumber].filter(Boolean).join(' ')}`}
            subtitle={`${enumLabel(PropertyUnitTypeLabel, u.type)}${u.floor ? ` · ${t('property.floorValue', { floor: u.floor })}` : ''}${
              u.bedrooms != null ? ` · ${t('property.bedroomsValue', { count: formatNumber(u.bedrooms) })}` : ''
            }`}
            badge={<StatusBadge status={u.status} labels={PropertyUnitStatusLabel} />}
            amount={u.marketRentRate != null ? money(u.marketRentRate) : null}
            onPress={() => router.push({ pathname: '/property/units/[id]', params: { id: u.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One unit, with what's needed on site: its status, its leases (current tenant) and its
 * maintenance requests, plus documents (e.g. inspection photos). */
export function UnitDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const unit = useUnit(id)
  const leases = useLeases({ unitId: id })
  const maintenance = useMaintenanceRequests({ unitId: id })

  return (
    <DetailScreen query={unit} errorMessage={t('property.units.loadError')} refetchAlso={[leases, maintenance]}>
      {(u) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <View style={styles.flex}>
                <Text variant="heading">{[u.buildingBlock, u.unitNumber].filter(Boolean).join(' · ')}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {enumLabel(PropertyUnitTypeLabel, u.type)}
                </Text>
              </View>
              <StatusBadge status={u.status} labels={PropertyUnitStatusLabel} />
            </View>
            <LinkField label={t('property.property')} value={u.propertyName} icon="business-outline" onPress={() => router.push({ pathname: '/property/properties/[id]', params: { id: u.propertyId } })} />
            <DetailField label={t('property.floor')} value={u.floor} />
            <DetailField label={t('property.area')} value={u.areaSize != null ? `${formatNumber(u.areaSize)} ${u.areaUnit ?? ''}`.trim() : null} />
            <DetailField label={t('property.bedrooms')} value={u.bedrooms != null ? formatNumber(u.bedrooms) : null} />
            <DetailField label={t('property.marketRent')} value={u.marketRentRate != null ? money(u.marketRentRate) : null} />
          </Card>

          <PagedSection
            title={t('property.leases.title')}
            query={leases}
            keyExtractor={(l) => l.id}
            emptyText={t('property.leases.empty')}
            errorMessage={t('property.leases.loadError')}
            renderItem={(l) => (
              <SectionRow
                title={`${l.leaseNumber} · ${l.rentalTenantName}`}
                subtitle={`${formatDay(l.startDate)} → ${formatDay(l.endDate)} · ${money(l.rentAmount)}`}
                trailing={<StatusBadge status={l.status} labels={LeaseStatusLabel} />}
                onPress={() => router.push({ pathname: '/property/leases/[id]', params: { id: l.id } })}
              />
            )}
          />

          <PagedSection
            title={t('property.maintenance.title')}
            query={maintenance}
            keyExtractor={(m) => m.id}
            emptyText={t('property.maintenance.empty')}
            errorMessage={t('property.maintenance.loadError')}
            renderItem={(m) => (
              <SectionRow
                title={m.requestNumber}
                subtitle={m.description}
                trailing={<StatusBadge status={m.status} labels={MaintenanceStatusLabel} />}
                onPress={() => router.push({ pathname: '/property/maintenance/[id]', params: { id: m.id } })}
              />
            )}
          />

          <DocumentsPanel entityType="PropertyUnit" entityId={u.id} />
        </>
      )}
    </DetailScreen>
  )
}

// --- Rental tenants ---

export function RentalTenantsListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const tenants = useRentalTenants({ search })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={tenants}
        header={<SearchField onSearch={setSearch} placeholder={t('property.tenants.search')} />}
        keyExtractor={(tn) => tn.id}
        emptyIcon="people-outline"
        emptyTitle={t('property.tenants.empty')}
        errorMessage={t('property.tenants.loadError')}
        renderItem={(tn) => (
          <RecordCard
            title={tn.customerName}
            subtitle={[tn.phone, tn.email].filter(Boolean).join(' · ') || null}
            meta={t('property.activeLeases', { count: formatNumber(tn.activeLeaseCount) })}
            badge={<StatusBadge status={tn.isActive ? 'Active' : 'Inactive'} />}
            onPress={() => router.push({ pathname: '/property/tenants/[id]', params: { id: tn.id } })}
          />
        )}
      />
    </Screen>
  )
}

export function RentalTenantDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const tenant = useRentalTenant(id)
  const leases = useLeases({ rentalTenantId: id })

  return (
    <DetailScreen query={tenant} errorMessage={t('property.tenants.loadError')} refetchAlso={[leases]}>
      {(tn) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {tn.customerName}
              </Text>
              <StatusBadge status={tn.isActive ? 'Active' : 'Inactive'} />
            </View>
            <ContactButtons phone={tn.phone} email={tn.email} />
          </Card>
          <Card>
            <ContactField kind="phone" label={t('crm.phone')} value={tn.phone} />
            <ContactField kind="email" label={t('crm.email')} value={tn.email} />
            <DetailField label={t('crm.address')} value={tn.address} />
            <DetailField label={t('property.tenantKind')} value={tn.isCompany ? t('property.company') : t('property.individual')} />
            <DetailField label={t('property.identification')} value={tn.identificationNumber} mono />
            {tn.notes ? <DetailField label={t('detail.notes')} value={tn.notes} /> : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(tn.createdAt)} />
          </Card>
          <View style={styles.stats}>
            <StatCard label={t('property.activeLeasesLabel')} value={formatNumber(tn.activeLeaseCount)} icon="document-text-outline" />
          </View>
          <PagedSection
            title={t('property.leases.title')}
            query={leases}
            keyExtractor={(l) => l.id}
            emptyText={t('property.leases.empty')}
            errorMessage={t('property.leases.loadError')}
            renderItem={(l) => (
              <SectionRow
                title={`${l.leaseNumber} · ${l.propertyName} ${l.unitNumber}`}
                subtitle={`${formatDay(l.startDate)} → ${formatDay(l.endDate)} · ${money(l.rentAmount)}`}
                trailing={<StatusBadge status={l.status} labels={LeaseStatusLabel} />}
                onPress={() => router.push({ pathname: '/property/leases/[id]', params: { id: l.id } })}
              />
            )}
          />
          <DocumentsPanel entityType="RentalTenant" entityId={tn.id} />
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
