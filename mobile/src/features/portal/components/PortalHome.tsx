import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { usePortalAuth } from '@/auth/PortalAuthProvider'
import { Card, Icon, ListRow, Text, type IconName } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { HIT_TARGET, spacing, useTheme } from '@/theme'
import { PortalIdentityCard } from './PortalIdentityCard'

/**
 * The shared frame of every portal area's Home tab: a greeting, an account button (→ the portal
 * Account screen: preferences, device registration, sign-out), the identity card, then the area's
 * own at-a-glance figures and shortcuts. Pull-to-refresh refetches whatever the area passes.
 *
 * Deliberately NOT the internal app's Work-tab module list: a portal user only ever sees their own
 * handful of destinations.
 */
export function PortalHomeScaffold({ refetch, children }: { refetch: () => Promise<unknown>; children: ReactNode }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const { profile } = usePortalAuth()
  // Re-render money() figures once the tenant's currency has loaded from /portal/localization.
  useTenantLocalization()
  const [refreshing, setRefreshing] = useState(false)
  if (!profile) return null

  async function onRefresh() {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            {t('portal.home.greeting', { name: profile.displayName })}
          </Text>
          <Text variant="bodySmall" color="mutedForeground">
            {profile.tenantName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('portal.account.title')}
          onPress={() => router.push('/portal/account')}
          hitSlop={8}
          style={({ pressed }) => [styles.accountButton, { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.7 }]}
        >
          <Icon name="person-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>
      <PortalIdentityCard profile={profile} compact />
      {children}
    </Screen>
  )
}

/** A wrapping row of `StatCard`s (two per line on a phone). */
export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>
}

export interface HomeLink {
  icon: IconName
  title: string
  subtitle?: string
  href: Href
}

/** The area's secondary destinations (payments history, maintenance, reports, …) as one card of
 * big, tappable rows. */
export function HomeLinks({ links }: { links: HomeLink[] }) {
  const { colors } = useTheme()
  return (
    <Card style={styles.linksCard}>
      {links.map((link, index) => (
        <View key={link.title} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}>
          <ListRow icon={link.icon} title={link.title} subtitle={link.subtitle} onPress={() => router.push(link.href)} />
        </View>
      ))}
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountButton: { width: HIT_TARGET, height: HIT_TARGET, borderRadius: HIT_TARGET / 2, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  linksCard: { paddingVertical: spacing.xs, gap: 0 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
})
