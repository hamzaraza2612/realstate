import { StyleSheet, View } from 'react-native'
import { spacing, useTheme } from '@/theme'
import { Card } from './Card'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

/** KPI tile — label, a big authoritative number (already formatted by the caller from a real API
 * field; this component never computes), and an optional hint line. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  onPress,
}: {
  label: string
  value: string
  hint?: string
  icon?: IconName
  onPress?: () => void
}) {
  const { colors } = useTheme()
  return (
    <Card style={styles.card} onPress={onPress} accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.labelRow}>
        {icon ? <Icon name={icon} size={16} color={colors.mutedForeground} /> : null}
        <Text variant="caption" color="mutedForeground" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" color="mutedForeground" numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { flexShrink: 1 },
})
