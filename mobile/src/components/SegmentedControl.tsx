import { Pressable, StyleSheet, View } from 'react-native'
import { radius, spacing, useTheme } from '@/theme'
import { Text } from './Text'

/** Small inline choice (2-3 options): language, theme, list filters. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.track, { backgroundColor: colors.muted }]}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text variant="bodySmall" style={{ fontWeight: selected ? '600' : '400' }} color={selected ? 'foreground' : 'mutedForeground'}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.sm,
  },
})
