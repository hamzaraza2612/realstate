import { View } from 'react-native'
import { Stack } from 'expo-router'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useTheme } from '@/theme'

/** The external-portal app. Only reachable with a portal session (see app/_layout.tsx); shares the
 * design-system layer with the internal app but no data hook, client or screen. The per-actor
 * areas (customer/tenant/owner/vendor/agent/member) are added here in Phase 3. */
export default function PortalLayout() {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </View>
  )
}
