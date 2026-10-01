import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { HIT_TARGET, spacing, useTheme } from '@/theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

/** A tappable list row: leading icon, title/subtitle, trailing accessory + RTL-aware chevron. */
export function ListRow({
  title,
  subtitle,
  icon,
  trailing,
  onPress,
  showChevron = !!onPress,
}: {
  title: string
  subtitle?: string
  icon?: IconName
  trailing?: ReactNode
  onPress?: () => void
  showChevron?: boolean
}) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="subheading" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="mutedForeground" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevron-forward" size={18} color={colors.mutedForeground} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: HIT_TARGET + 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})
