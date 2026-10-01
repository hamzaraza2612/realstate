import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, spacing, useTheme } from '@/theme'
import { Text } from './Text'

/** Surface container — the mobile `Card`. Pass `onPress` to make the whole card a touch target. */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  const surface = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...surface, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    )
  }
  return <View style={surface}>{children}</View>
}

/** Title row for a card: heading on the start side, an optional action on the end side. */
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="mutedForeground">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
})
