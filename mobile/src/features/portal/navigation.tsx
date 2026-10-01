import type { ColorValue } from 'react-native'
import { Redirect, Stack } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { usePortalAuth } from '@/auth/PortalAuthProvider'
import { Icon, type IconName } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'
import { PORTAL_AREAS, type PortalArea } from './areas'
import { usePortalUnreadCount } from './api/common'

/** Shared native-stack header styling for the portal (same visual language as the internal app). */
export function usePortalStackOptions() {
  const { colors } = useTheme()
  const { t } = useI18n()
  return {
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.foreground },
    headerBackTitle: t('common.back'),
    contentStyle: { backgroundColor: colors.background },
  }
}

/** The area the signed-in portal user belongs to (null while signing out). */
export function usePortalArea(): PortalArea | null {
  const { profile } = usePortalAuth()
  return profile ? PORTAL_AREAS[profile.actorType] : null
}

/**
 * Layout of one portal area (`app/(portal)/portal/<slug>/_layout.tsx`): its tab bar plus the detail
 * screens pushed over it. A portal user of another actor type is sent back to `/portal` (→ their
 * own area) — a UX guard only; the backend's `PortalControllerBase` already 403s a token pointed at
 * another area's endpoints.
 */
export function PortalAreaStack({ area, screens }: { area: PortalArea; screens: [name: string, titleKey: string][] }) {
  const { t } = useI18n()
  const { profile } = usePortalAuth()
  const options = usePortalStackOptions()
  if (!profile) return null
  if (profile.actorType !== area.actorType) return <Redirect href="/portal" />
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {screens.map(([name, titleKey]) => (
        <Stack.Screen key={name} name={name} options={{ title: t(titleKey) }} />
      ))}
    </Stack>
  )
}

/**
 * A portal area's bottom tabs — exactly four, single-purpose destinations: Home, the area's own
 * primary records, Documents, Notifications (with the unread badge). Secondary screens (payments,
 * maintenance, reports, assigned work, memberships) are reached from Home; Account from the Home
 * header. Intentionally nothing like the internal app's Home/Work/Approvals module navigation.
 */
export function PortalAreaTabs({ area, primary }: { area: PortalArea; primary: { name: string; titleKey: string; icon: IconName } }) {
  const { colors } = useTheme()
  const { t } = useI18n()
  const unread = usePortalUnreadCount(area)

  const icon = (name: IconName) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Icon name={name} size={size} color={color} />
    }
  const badge = (count: number | undefined) => (count && count > 0 ? (count > 99 ? '99+' : count) : undefined)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarBadgeStyle: { backgroundColor: colors.destructive, color: colors.destructiveForeground },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name={primary.name} options={{ title: t(primary.titleKey), tabBarIcon: icon(primary.icon) }} />
      <Tabs.Screen name="documents" options={{ title: t('documents.title'), tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: t('tabs.notifications'), tabBarIcon: icon('notifications-outline'), tabBarBadge: badge(unread.data) }}
      />
    </Tabs>
  )
}
