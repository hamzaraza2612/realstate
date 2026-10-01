import { View } from 'react-native'
import { Stack } from 'expo-router'
import { OfflineBanner } from '@/components/OfflineBanner'
import { usePortalStackOptions } from '@/features/portal/navigation'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'

/**
 * The external-portal app. Only reachable with a portal session (see app/_layout.tsx); shares the
 * design-system layer with the internal app but no data hook, client or screen — every portal
 * screen talks to the backend through `portalApiClient` only.
 *
 * `/portal` redirects to the signed-in user's own actor area (customer / tenant / owner / vendor /
 * member — one per `PortalProfile.actorType`), each with its own small tab bar. The Agent view is
 * NOT here: `AgentPortalController` is internal staff auth, so it lives under `app/(internal)/agent`.
 */
export default function PortalLayout() {
  const { colors } = useTheme()
  const { t } = useI18n()
  const options = usePortalStackOptions()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <Stack screenOptions={{ ...options, headerShown: false }}>
        <Stack.Screen name="portal/account" options={{ headerShown: true, title: t('portal.account.title') }} />
      </Stack>
    </View>
  )
}
