import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Card, CardHeader, DetailField, DetailScreen, ErrorState, LinkField, LoadingState, PagedList, RecordCard, Screen, SearchField, SectionRow, StatCard, StatusBadge, StatusFilter, Text } from '@/components'
import { DocumentsPanel } from '@/features/documents/DocumentsPanel'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { spacing } from '@/theme'
import {
  BookingStatusLabel,
  InstallmentFrequencyLabel,
  InstallmentStatusLabel,
  PaymentMethodLabel,
  PaymentPlanTypeLabel,
  type BookingDto,
  type BookingStatus,
} from '@/types/modules'
import { formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import { useBooking, useBookingPayments, useBookings, usePaymentPlan } from './api'

/** Bookings — `GET /sales/bookings` with the endpoint's `search` (booking number / customer) and
 * `status` filters, 20 per page. */
export function BookingsListScreen() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookingStatus | undefined>()
  const bookings = useBookings({ search, status })

  return (
    <Screen scroll={false} edges={[]}>
      <PagedList
        query={bookings}
        header={
          <>
            <SearchField onSearch={setSearch} placeholder={t('sales.bookings.search')} />
            <StatusFilter labels={BookingStatusLabel} value={status} onChange={setStatus} />
          </>
        }
        keyExtractor={(booking) => booking.id}
        emptyIcon="receipt-outline"
        emptyTitle={t('sales.bookings.empty')}
        errorMessage={t('sales.bookings.loadError')}
        renderItem={(booking) => (
          <RecordCard
            title={`${booking.bookingNumber} · ${booking.customerName}`}
            subtitle={`${booking.projectName} · ${booking.inventoryUnitCode}`}
            meta={formatDay(booking.bookingDate)}
            badge={<StatusBadge status={booking.status} labels={BookingStatusLabel} />}
            amount={money(booking.netPrice)}
            onPress={() => router.push({ pathname: '/sales/bookings/[id]', params: { id: booking.id } })}
          />
        )}
      />
    </Screen>
  )
}

/**
 * One booking (`GET /sales/bookings/{id}`) with what a sales person checks on the go: price
 * breakdown, the payment plan's installments and their payment status (`/payment-plan`), the
 * payments received (`/payments`), and attached documents. All amounts are the server's figures.
 */
export function BookingDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const booking = useBooking(id)
  const payments = useBookingPayments(id)
  const plan = usePaymentPlan(id, booking.data?.hasPaymentPlan === true)
  const canViewCustomer = usePermission('crm.customer.view')

  return (
    <DetailScreen query={booking} errorMessage={t('sales.bookings.loadError')} refetchAlso={[payments, ...(booking.data?.hasPaymentPlan ? [plan] : [])]}>
      {(item) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {item.bookingNumber}
              </Text>
              <StatusBadge status={item.status} labels={BookingStatusLabel} />
            </View>
            {canViewCustomer ? (
              <LinkField
                label={t('sales.customer')}
                value={item.customerName}
                icon="person-outline"
                onPress={() => router.push({ pathname: '/crm/customers/[id]', params: { id: item.customerId } })}
              />
            ) : (
              <DetailField label={t('sales.customer')} value={item.customerName} />
            )}
            <DetailField label={t('sales.project')} value={item.projectName} />
            <DetailField label={t('sales.unit')} value={item.inventoryUnitCode} />
            <DetailField label={t('sales.agent')} value={item.salesAgentUserName} />
            <DetailField label={t('sales.bookingDate')} value={formatDay(item.bookingDate)} />
            {item.notes ? <DetailField label={t('detail.notes')} value={item.notes} /> : null}
          </Card>

          <View style={styles.stats}>
            <StatCard label={t('sales.totalPrice')} value={money(item.totalPrice)} />
            <StatCard label={t('sales.discount')} value={money(item.discount)} />
            <StatCard label={t('sales.netPrice')} value={money(item.netPrice)} />
          </View>

          <PaymentPlanCard booking={item} plan={plan} />
          <PaymentsCard payments={payments} />
          <DocumentsPanel entityType="Booking" entityId={item.id} />
        </>
      )}
    </DetailScreen>
  )
}

function PaymentPlanCard({ booking, plan }: { booking: BookingDto; plan: ReturnType<typeof usePaymentPlan> }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  if (!booking.hasPaymentPlan) {
    return (
      <Card>
        <CardHeader title={t('sales.plan.title')} />
        <Text variant="bodySmall" color="mutedForeground">
          {t('sales.plan.none')}
        </Text>
      </Card>
    )
  }
  if (plan.isLoading) return <LoadingState variant="cards" rows={1} />
  if (!plan.data) return <ErrorState message={t('sales.plan.loadError')} onRetry={() => plan.refetch()} />

  const data = plan.data
  return (
    <Card>
      <CardHeader
        title={t('sales.plan.title')}
        subtitle={`${data.name} · ${enumLabel(PaymentPlanTypeLabel, data.planType)} · ${enumLabel(InstallmentFrequencyLabel, data.frequency)}`}
      />
      <DetailField label={t('sales.plan.scheduled')} value={moneyExact(data.totalScheduled)} />
      <Text variant="caption" color="mutedForeground">
        {t('sales.plan.summary', {
          count: formatNumber(data.numberOfInstallments),
          downPayment: money(data.downPayment),
          grace: formatNumber(data.gracePeriodDays),
        })}
      </Text>
      <View>
        {data.installments.map((installment) => (
          <SectionRow
            key={installment.id}
            title={`${installment.installmentNumber}. ${installment.label}`}
            subtitle={t('sales.plan.installmentLine', {
              due: formatDay(installment.dueDate),
              amount: moneyExact(installment.amount),
              paid: moneyExact(installment.paidAmount),
              remaining: moneyExact(installment.remainingAmount),
            })}
            trailing={<StatusBadge status={installment.status} labels={InstallmentStatusLabel} />}
          />
        ))}
      </View>
    </Card>
  )
}

function PaymentsCard({ payments }: { payments: ReturnType<typeof useBookingPayments> }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  return (
    <Card>
      <CardHeader title={t('sales.payments.title')} />
      {payments.isLoading ? (
        <LoadingState rows={2} />
      ) : payments.isError ? (
        <ErrorState message={t('sales.payments.loadError')} onRetry={() => payments.refetch()} />
      ) : (payments.data ?? []).length === 0 ? (
        <Text variant="bodySmall" color="mutedForeground">
          {t('sales.payments.empty')}
        </Text>
      ) : (
        <View>
          {payments.data!.map((payment) => (
            <SectionRow
              key={payment.id}
              title={`${payment.receiptNumber} · ${payment.installmentLabel}`}
              subtitle={`${formatDay(payment.paymentDate)} · ${enumLabel(PaymentMethodLabel, payment.method)}${payment.referenceNumber ? ` · ${payment.referenceNumber}` : ''}`}
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
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amount: { fontWeight: '600' },
})
