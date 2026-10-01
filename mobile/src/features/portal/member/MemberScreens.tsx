import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { extractStatus } from '@/api/portalApiClient'
import { flattenPages, pagedTotal } from '@/api/pagedQuery'
import { Card, CardHeader, DetailField, DetailScreen, ErrorState, LoadingState, PagedList, RecordCard, SectionRow, StatCard, StatusBadge, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useEnumLabel } from '@/i18n/enumLabel'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing } from '@/theme'
import {
  BookingResourceTypeLabel,
  CoworkingBookingStatus,
  CoworkingBookingStatusLabel,
  MembershipStatusLabel,
  type CoworkingBookingDto,
  type MembershipDto,
} from '@/types/modules'
import { formatDateTime, formatDay, formatNumber, money, moneyExact } from '@/utils/format'
import { HOME_SAMPLE_SIZE, useMemberActiveMembership, useMemberBooking, useMemberBookings, useMemberMemberships } from '../api/resources'
import { HomeLinks, PortalHomeScaffold, StatGrid } from '../components/PortalHome'

/**
 * Coworking-member portal (`/portal/member`): the active membership (plan, period, amount / paid),
 * membership history, desk & meeting-room bookings, documents and notifications. Read-only — the
 * backend offers members no self-service booking endpoint, so none is shown. No payment ledger
 * either: the backend has no member payment read service (see `IPortalMemberService`), and the
 * amount / paid already on each membership and booking is what is shown.
 */

const bookingHref = (id: string) => ({ pathname: '/portal/member/booking/[id]' as const, params: { id } })

function isUpcoming(booking: CoworkingBookingDto, now: number) {
  return (
    new Date(booking.endAt).getTime() >= now &&
    (booking.status === CoworkingBookingStatus.Pending || booking.status === CoworkingBookingStatus.Confirmed)
  )
}

export function MemberHomeScreen() {
  const { t } = useI18n()
  const membership = useMemberActiveMembership()
  const bookings = useMemberBookings({ pageSize: HOME_SAMPLE_SIZE })
  // Captured once per mount so "upcoming" is stable across re-renders.
  const [now] = useState(() => Date.now())
  const upcoming = flattenPages(bookings.data)
    .filter((b) => isUpcoming(b, now))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const next = upcoming[0]
  const m = membership.data
  const noMembership = !m && extractStatus(membership.error) === 404
  const balanceDue = m ? Math.max(0, m.amount - m.paidAmount) : 0

  return (
    <PortalHomeScaffold refetch={() => Promise.all([membership.refetch(), bookings.refetch()])}>
      <StatGrid>
        <StatCard
          icon="id-card-outline"
          label={t('portal.member.membership')}
          value={membership.isLoading ? '…' : m ? m.planName : '—'}
          hint={m ? t('portal.member.until', { date: formatDay(m.endDate) }) : noMembership ? t('portal.member.noMembership') : undefined}
        />
        <StatCard
          icon="wallet-outline"
          label={t('portal.member.balanceDue')}
          value={membership.isLoading ? '…' : m ? money(balanceDue) : '—'}
          hint={m ? t('portal.member.paidOf', { paid: money(m.paidAmount), amount: money(m.amount) }) : undefined}
        />
        <StatCard
          icon="calendar-outline"
          label={t('portal.member.nextBooking')}
          value={bookings.isLoading ? '…' : next ? next.resourceLabel : '—'}
          hint={bookings.isLoading ? undefined : next ? formatDateTime(next.startAt) : t('portal.member.noUpcoming')}
          onPress={next ? () => router.push(bookingHref(next.id)) : () => router.push('/portal/member/bookings')}
        />
      </StatGrid>
      {membership.isError && !noMembership ? <ErrorState message={t('portal.member.membershipError')} onRetry={() => membership.refetch()} /> : null}

      {m ? (
        <Card>
          <CardHeader title={t('portal.member.activeMembership')} />
          <View style={styles.titleRow}>
            <Text variant="heading" style={styles.flex}>
              {m.planName}
            </Text>
            <StatusBadge status={m.status} labels={MembershipStatusLabel} />
          </View>
          <DetailField label={t('portal.member.period')} value={`${formatDay(m.startDate)} → ${formatDay(m.endDate)}`} />
          <DetailField label={t('construction.amount')} value={moneyExact(m.amount)} />
          <DetailField label={t('facility.paid')} value={moneyExact(m.paidAmount)} />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t('portal.member.upcomingBookings')}
          subtitle={bookings.data ? t('portal.member.totalBookings', { count: formatNumber(pagedTotal(bookings.data) ?? 0) }) : undefined}
        />
        {bookings.isLoading ? (
          <LoadingState rows={2} />
        ) : bookings.isError ? (
          <ErrorState message={t('facility.coworkingBookings.loadError')} onRetry={() => bookings.refetch()} />
        ) : upcoming.length === 0 ? (
          <Text variant="bodySmall" color="mutedForeground">
            {t('portal.member.noUpcoming')}
          </Text>
        ) : (
          upcoming.slice(0, 3).map((b) => (
            <SectionRow
              key={b.id}
              title={b.resourceLabel}
              subtitle={`${formatDateTime(b.startAt)} → ${formatDateTime(b.endAt)}`}
              trailing={<StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />}
              onPress={() => router.push(bookingHref(b.id))}
            />
          ))
        )}
      </Card>

      <HomeLinks links={[{ icon: 'id-card-outline', title: t('portal.member.memberships'), subtitle: t('portal.member.membershipsLink'), href: '/portal/member/memberships' }]} />
    </PortalHomeScaffold>
  )
}

export function MemberBookingsScreen() {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const bookings = useMemberBookings()
  useTenantLocalization()
  return (
    <Screen scroll={false}>
      <PagedList<CoworkingBookingDto>
        query={bookings}
        header={<Text variant="title">{t('portal.member.bookings')}</Text>}
        keyExtractor={(b) => b.id}
        emptyIcon="calendar-outline"
        emptyTitle={t('portal.member.noBookings')}
        errorMessage={t('facility.coworkingBookings.loadError')}
        renderItem={(b) => (
          <RecordCard
            title={b.resourceLabel}
            subtitle={enumLabel(BookingResourceTypeLabel, b.resourceType)}
            meta={`${formatDateTime(b.startAt)} → ${formatDateTime(b.endAt)}`}
            badge={<StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />}
            amount={money(b.price)}
            onPress={() => router.push(bookingHref(b.id))}
          />
        )}
      />
    </Screen>
  )
}

export function MemberBookingDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const enumLabel = useEnumLabel()
  const booking = useMemberBooking(id)
  return (
    <DetailScreen query={booking} errorMessage={t('facility.coworkingBookings.loadError')}>
      {(b) => (
        <>
          <Card>
            <View style={styles.titleRow}>
              <Text variant="heading" style={styles.flex}>
                {b.resourceLabel}
              </Text>
              <StatusBadge status={b.status} labels={CoworkingBookingStatusLabel} />
            </View>
            <DetailField label={t('portal.member.resourceType')} value={enumLabel(BookingResourceTypeLabel, b.resourceType)} />
            <DetailField label={t('facility.starts')} value={formatDateTime(b.startAt)} />
            <DetailField label={t('facility.ends')} value={formatDateTime(b.endAt)} />
            {b.notes ? <DetailField label={t('detail.notes')} value={b.notes} /> : null}
          </Card>
          <StatGrid>
            <StatCard label={t('facility.price')} value={moneyExact(b.price)} />
            <StatCard label={t('facility.paid')} value={moneyExact(b.paidAmount)} />
            <StatCard label={t('portal.member.balanceDue')} value={moneyExact(Math.max(0, b.price - b.paidAmount))} />
          </StatGrid>
        </>
      )}
    </DetailScreen>
  )
}

/** Every membership period the member has held (server-paged). */
export function MemberMembershipsScreen() {
  const { t } = useI18n()
  const memberships = useMemberMemberships()
  useTenantLocalization()
  return (
    <Screen scroll={false} edges={[]}>
      <PagedList<MembershipDto>
        query={memberships}
        keyExtractor={(m) => m.id}
        emptyIcon="id-card-outline"
        emptyTitle={t('portal.member.noMembership')}
        errorMessage={t('portal.member.membershipError')}
        renderItem={(m) => (
          <RecordCard
            title={m.planName}
            subtitle={`${formatDay(m.startDate)} → ${formatDay(m.endDate)}`}
            meta={t('portal.member.paidOf', { paid: moneyExact(m.paidAmount), amount: moneyExact(m.amount) })}
            badge={<StatusBadge status={m.status} labels={MembershipStatusLabel} />}
          />
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
})
