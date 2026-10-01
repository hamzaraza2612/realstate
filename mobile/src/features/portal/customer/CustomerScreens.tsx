import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { extractStatus } from '@/api/portalApiClient'
import { flattenPages, pagedTotal } from '@/api/pagedQuery'
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
  StatCard,
  StatusBadge,
  Text,
} from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing, useTheme } from '@/theme'
import {
  BookingStatus,
  BookingStatusLabel,
  InstallmentStatus,
  InstallmentStatusLabel,
  PaymentMethodLabel,
  type BookingDto,
  type InstallmentDto,
} from '@/types/modules'
import { formatDay, formatNumber, money, moneyExact, tenantToday } from '@/utils/format'
import {
  HOME_SAMPLE_SIZE,
  useCustomerBooking,
  useCustomerBookingPayments,
  useCustomerBookings,
  useCustomerPaymentPlan,
  useCustomerPaymentPlans,
  useCustomerPayments,
} from '../api/resources'
import { HomeLinks, PortalHomeScaffold, StatGrid } from '../components/PortalHome'

/**
 * Customer portal (`/portal/customer`): bookings with their payment plan and payments received, the
 * customer's full payment history, documents and notifications — the mobile take on the web
 * `modules/portal/customer`. Read-only (the backend offers the customer no write here).
 */

const bookingHref = (id: string) => ({ pathname: '/portal/customer/booking/[id]' as const, params: { id } })

function isOpenInstallment(installment: InstallmentDto) {
  return installment.status !== InstallmentStatus.Paid && installment.status !== InstallmentStatus.Cancelled && installment.remainingAmount > 0
}

export function CustomerHomeScreen() {
  const { t } = useI18n()
  const bookings = useCustomerBookings({ pageSize: HOME_SAMPLE_SIZE })
  const payments = useCustomerPayments()
  const items = flattenPages(bookings.data)
  const total = pagedTotal(bookings.data)
  const confirmed = items.filter((b) => b.status === BookingStatus.Confirmed)
  const plans = useCustomerPaymentPlans(confirmed.filter((b) => b.hasPaymentPlan).map((b) => b.id))

  // Next installment due across the customer's confirmed bookings — the earliest unpaid installment
  // of the payment plans the server returned (InstallmentDto.remainingAmount/status are server-computed).
  const today = tenantToday()
  const open: { installment: InstallmentDto; bookingNumber: string }[] = []
  for (const query of plans) {
    const plan = query.data
    if (!plan) continue
    const booking = confirmed.find((b) => b.id === plan.bookingId)
    for (const installment of plan.installments) {
      if (isOpenInstallment(installment)) open.push({ installment, bookingNumber: booking?.bookingNumber ?? '' })
    }
  }
  const next = open.sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate))[0]
  const plansLoading = plans.some((q) => q.isLoading)
  const nextOverdue = !!next && (next.installment.status === InstallmentStatus.Overdue || next.installment.dueDate < today)

  const totalPaid = (payments.data ?? []).reduce((sum, entry) => sum + entry.payment.amount, 0)

  return (
    <PortalHomeScaffold refetch={() => Promise.all([bookings.refetch(), payments.refetch(), ...plans.map((q) => q.refetch())])}>
      {bookings.isError ? <ErrorState message={t('portal.home.loadError')} onRetry={() => bookings.refetch()} /> : null}
      <StatGrid>
        <StatCard
          icon="receipt-outline"
          label={t('portal.customer.bookings')}
          value={bookings.isLoading ? '…' : formatNumber(total ?? 0)}
          hint={bookings.data ? t('portal.customer.confirmedCount', { count: formatNumber(confirmed.length) }) : undefined}
          onPress={() => router.push('/portal/customer/bookings')}
        />
        <StatCard
          icon="calendar-outline"
          label={t('portal.customer.nextInstallment')}
          value={bookings.isLoading || plansLoading ? '…' : next ? moneyExact(next.installment.remainingAmount) : '—'}
          hint={
            bookings.isLoading || plansLoading
              ? undefined
              : next
                ? t(nextOverdue ? 'portal.overdueSince' : 'portal.dueOn', { date: formatDay(next.installment.dueDate) }) + ` · ${next.bookingNumber}`
                : t('portal.nothingDue')
          }
        />
        <StatCard
          icon="cash-outline"
          label={t('portal.totalPaid')}
          value={payments.isLoading ? '…' : payments.isError ? '—' : money(totalPaid)}
          hint={payments.data ? t('portal.paymentsCount', { count: formatNumber(payments.data.length) }) : undefined}
          onPress={() => router.push('/portal/customer/payments')}
        />
      </StatGrid>

      <Card>
        <CardHeader title={t('portal.customer.recentBookings')} />
        {bookings.isLoading ? (
          <LoadingState rows={2} />
        ) : items.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.customer.noBookings')}
          </Text>
        ) : (
          items.slice(0, 3).map((b) => (
            <SectionRow
              key={b.id}
              title={b.bookingNumber}
              subtitle={`${b.projectName} · ${b.inventoryUnitCode}`}
              trailing={<StatusBadge status={b.status} labels={BookingStatusLabel} />}
              onPress={() => router.push(bookingHref(b.id))}
            />
          ))
        )}
      </Card>

      <HomeLinks links={[{ icon: 'wallet-outline', title: t('portal.payments.title'), subtitle: t('portal.customer.paymentsLink'), href: '/portal/customer/payments' }]} />
    </PortalHomeScaffold>
  )
}

export function CustomerBookingsScreen() {
  const { t } = useI18n()
  const bookings = useCustomerBookings()
  useTenantLocalization()
  return (
    <Screen scroll={false}>
      <PagedList<BookingDto>
        query={bookings}
        header={<Text variant="title">{t('portal.customer.bookings')}</Text>}
        keyExtractor={(b) => b.id}
        emptyIcon="receipt-outline"
        emptyTitle={t('portal.customer.noBookings')}
        emptyDescription={t('portal.customer.noBookingsDescription')}
        errorMessage={t('sales.bookings.loadError')}
        renderItem={(b) => (
          <RecordCard
            title={b.bookingNumber}
            subtitle={`${b.projectName} · ${b.inventoryUnitCode}`}
            meta={t('portal.bookedOn', { date: formatDay(b.bookingDate) })}
            badge={<StatusBadge status={b.status} labels={BookingStatusLabel} />}
            amount={money(b.netPrice)}
            onPress={() => router.push(bookingHref(b.id))}
          />
        )}
      />
    </Screen>
  )
}

/** One booking: its price breakdown, the payment plan's installments (server-computed paid /
 * remaining / status) and the payments received against it. */
export function CustomerBookingDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const booking = useCustomerBooking(id)
  const plan = useCustomerPaymentPlan(id)
  const payments = useCustomerBookingPayments(id)

  return (
    <DetailScreen query={booking} errorMessage={t('sales.bookings.loadError')} refetchAlso={[plan, payments]}>
      {(b) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {b.bookingNumber}
              </Text>
              <StatusBadge status={b.status} labels={BookingStatusLabel} />
            </View>
            <DetailField label={t('sales.project')} value={b.projectName} />
            <DetailField label={t('sales.unit')} value={b.inventoryUnitCode} />
            <DetailField label={t('sales.bookingDate')} value={formatDay(b.bookingDate)} />
            {b.salesAgentUserName ? <DetailField label={t('portal.customer.yourAgent')} value={b.salesAgentUserName} /> : null}
            {b.notes ? <DetailField label={t('detail.notes')} value={b.notes} /> : null}
          </Card>

          <StatGrid>
            <StatCard label={t('sales.totalPrice')} value={moneyExact(b.totalPrice)} />
            <StatCard label={t('sales.discount')} value={moneyExact(b.discount)} />
            <StatCard label={t('sales.netPrice')} value={moneyExact(b.netPrice)} />
          </StatGrid>

          <Card>
            <CardHeader
              title={t('sales.plan.title')}
              subtitle={plan.data ? t('sales.plan.summary', { count: formatNumber(plan.data.numberOfInstallments), downPayment: moneyExact(plan.data.downPayment), grace: formatNumber(plan.data.gracePeriodDays) }) : undefined}
            />
            {plan.isLoading ? (
              <LoadingState rows={2} />
            ) : plan.data ? (
              plan.data.installments.map((i) => (
                <SectionRow
                  key={i.id}
                  title={`${formatNumber(i.installmentNumber)}. ${i.label}`}
                  subtitle={t('sales.plan.installmentLine', {
                    due: formatDay(i.dueDate),
                    amount: moneyExact(i.amount),
                    paid: moneyExact(i.paidAmount),
                    remaining: moneyExact(i.remainingAmount),
                  })}
                  trailing={<StatusBadge status={i.status} labels={InstallmentStatusLabel} />}
                />
              ))
            ) : extractStatus(plan.error) === 404 ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('sales.plan.none')}
              </Text>
            ) : (
              <ErrorState message={t('sales.plan.loadError')} onRetry={() => plan.refetch()} />
            )}
          </Card>

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
              payments.data!.map((p) => (
                <SectionRow
                  key={p.id}
                  title={`${p.receiptNumber} · ${p.installmentLabel}`}
                  subtitle={`${formatDay(p.paymentDate)} · ${enumLabel(PaymentMethodLabel, p.method)}`}
                  trailing={
                    <Text variant="bodySmall" style={styles.amount}>
                      {moneyExact(p.amount)}
                    </Text>
                  }
                />
              ))
            )}
          </Card>
        </>
      )}
    </DetailScreen>
  )
}

/** Every payment across all of the customer's bookings, newest first (`GET /portal/customer/payments`
 * — returned by the backend as one bounded list, not paged). */
export function CustomerPaymentsScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const { colors } = useTheme()
  const payments = useCustomerPayments()
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
            <ErrorState message={t('sales.payments.loadError')} onRetry={() => payments.refetch()} />
          ) : (
            <EmptyState icon="wallet-outline" title={t('sales.payments.empty')} />
          )
        }
        renderItem={({ item }) => (
          <RecordCard
            title={`${item.payment.receiptNumber} · ${item.bookingNumber}`}
            subtitle={item.payment.installmentLabel}
            meta={`${formatDay(item.payment.paymentDate)} · ${enumLabel(PaymentMethodLabel, item.payment.method)}`}
            amount={moneyExact(item.payment.amount)}
            onPress={() => router.push(bookingHref(item.bookingId))}
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
})
