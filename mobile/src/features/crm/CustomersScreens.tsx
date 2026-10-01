import { useState } from 'react'
import { router } from 'expo-router'
import { Card, ContactButtons, ContactField, DetailField, DetailScreen, LinkField, PagedList, PagedSection, RecordCard, Screen, SearchField, SectionRow, StatusBadge, Text } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { useBookings } from '@/features/sales/api'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { BookingStatusLabel } from '@/types/modules'
import { formatDateTime, formatDay, money } from '@/utils/format'
import { ActivitiesSection } from './ActivitiesSection'
import { useCustomer, useCustomers } from './api'

/** Customers — `GET /crm/customers` with the endpoint's `search` filter, 20 per page. */
export function CustomersListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const customers = useCustomers(search)

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={customers}
        header={<SearchField onSearch={setSearch} placeholder={t('crm.customers.search')} />}
        keyExtractor={(customer) => customer.id}
        emptyIcon="people-outline"
        emptyTitle={t('crm.customers.empty')}
        errorMessage={t('crm.customers.loadError')}
        renderItem={(customer) => (
          <RecordCard
            title={customer.fullName}
            subtitle={[customer.companyName, customer.phone ?? customer.email].filter(Boolean).join(' · ') || null}
            meta={t('detail.createdOn', { date: formatDateTime(customer.createdAt) })}
            onPress={() => router.push({ pathname: '/crm/customers/[id]', params: { id: customer.id } })}
          />
        )}
      />
    </Screen>
  )
}

/** One customer (`GET /crm/customers/{id}`): contact hand-offs, details, the customer's bookings
 * (`GET /sales/bookings?customerId=`, with `sales.booking.view`), activities and documents. */
export function CustomerDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const customer = useCustomer(id)
  const canViewBookings = usePermission('sales.booking.view')
  const canViewLeads = usePermission('crm.lead.view')
  const bookings = useBookings({ customerId: id }, canViewBookings)

  return (
    <DetailScreen query={customer} errorMessage={t('crm.customers.loadError')} refetchAlso={canViewBookings ? [bookings] : []}>
      {(item) => (
        <>
          <Card>
            <Text variant="heading">{item.fullName}</Text>
            {item.companyName ? (
              <Text variant="bodySmall" color="mutedForeground">
                {item.companyName}
              </Text>
            ) : null}
            <ContactButtons phone={item.phone} email={item.email} />
          </Card>

          <Card>
            <ContactField kind="phone" label={t('crm.phone')} value={item.phone} />
            <ContactField kind="email" label={t('crm.email')} value={item.email} />
            <DetailField label={t('crm.address')} value={item.address} />
            {item.convertedFromLeadId && canViewLeads ? (
              <LinkField
                label={t('crm.convertedFrom')}
                value={t('crm.viewLead')}
                icon="person-add-outline"
                onPress={() => router.push({ pathname: '/crm/leads/[id]', params: { id: item.convertedFromLeadId! } })}
              />
            ) : null}
            <DetailField label={t('detail.createdAt')} value={formatDateTime(item.createdAt)} />
          </Card>

          {canViewBookings ? (
            <PagedSection
              title={t('sales.bookings.title')}
              query={bookings}
              keyExtractor={(booking) => booking.id}
              emptyText={t('sales.bookings.emptyForCustomer')}
              errorMessage={t('sales.bookings.loadError')}
              renderItem={(booking) => (
                <SectionRow
                  title={`${booking.bookingNumber} · ${booking.projectName}`}
                  subtitle={`${booking.inventoryUnitCode} · ${formatDay(booking.bookingDate)} · ${money(booking.netPrice)}`}
                  trailing={<StatusBadge status={booking.status} labels={BookingStatusLabel} />}
                  onPress={() => router.push({ pathname: '/sales/bookings/[id]', params: { id: booking.id } })}
                />
              )}
            />
          ) : null}

          <ActivitiesSection customerId={item.id} />
          <DocumentsPanel entityType="Customer" entityId={item.id} />
        </>
      )}
    </DetailScreen>
  )
}
