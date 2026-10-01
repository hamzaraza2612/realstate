import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { Icon } from './Icon'
import { Text } from './Text'

/** Persistent but dismissible "you're offline" strip — never a blocking screen. Reappears on the
 * next disconnect after being dismissed. */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus()
  const { t } = useI18n()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isOffline) setDismissed(false)
  }, [isOffline])

  if (!isOffline || dismissed) return null

  const tone = colors.tones.warning
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: tone.background, borderColor: tone.border, paddingTop: insets.top + spacing.sm }]}
    >
      <Icon name="cloud-offline-outline" size={18} color={tone.text} />
      <Text variant="bodySmall" style={[styles.text, { color: tone.text }]}>
        {t('offline.banner')}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('offline.dismiss')} onPress={() => setDismissed(true)} hitSlop={12}>
        <Icon name="close" size={18} color={tone.text} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  text: { flex: 1 },
})
