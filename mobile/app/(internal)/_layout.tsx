import { View } from 'react-native'
import { Stack } from 'expo-router'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'

/** The internal (staff) app: bottom tabs plus stack screens pushed over them (Command Center,
 * approval detail, module screens). Only reachable with a staff session (see app/_layout.tsx). */
export default function InternalLayout() {
  const { colors } = useTheme()
  const { t } = useI18n()
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
          headerBackTitle: t('common.back'),
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="command-center/index" options={{ title: t('nav.commandCenter') }} />
        <Stack.Screen name="command-center/ask" options={{ title: t('cc.ask') }} />
        <Stack.Screen name="command-center/attention" options={{ title: t('cc.attention') }} />
        <Stack.Screen name="approval/[id]" options={{ title: t('approvals.detailTitle') }} />
        <Stack.Screen name="module/[key]" options={{ title: '' }} />
      </Stack>
    </View>
  )
}
