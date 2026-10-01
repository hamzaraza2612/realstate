import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router/js-tabs'
import { Icon, type IconName } from '@/components/Icon'
import { usePendingApprovalCount } from '@/features/approvals/api'
import { useUnreadNotificationCount } from '@/features/notifications/api'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'

/** Bottom tabs — Home, Work, Approvals, Notifications, Profile (docs/MOBILE_ARCHITECTURE.md:
 * a handful of tabs, never 20 modules in a tab bar; modules live under "Work"). */
export default function TabsLayout() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const unread = useUnreadNotificationCount()
  const approvals = usePendingApprovalCount()

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
      <Tabs.Screen name="home" options={{ title: t('tabs.home'), tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="work" options={{ title: t('tabs.work'), tabBarIcon: icon('briefcase-outline') }} />
      <Tabs.Screen
        name="approvals"
        options={{ title: t('tabs.approvals'), tabBarIcon: icon('checkmark-done-outline'), tabBarBadge: badge(approvals.count) }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: t('tabs.notifications'), tabBarIcon: icon('notifications-outline'), tabBarBadge: badge(unread.data) }}
      />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-circle-outline') }} />
    </Tabs>
  )
}
