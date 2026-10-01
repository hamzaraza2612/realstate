import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { HIT_TARGET, radius, spacing, useTheme } from '@/theme'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'outline' | 'destructive' | 'ghost'

export interface ButtonProps {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityHint?: string
}

/** Mobile counterpart of the web shadcn `Button` (default / outline / destructive / ghost). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme()
  const isDisabled = disabled || loading

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground, border: colors.primary },
    outline: { bg: colors.card, fg: colors.foreground, border: colors.border },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground, border: colors.destructive },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  }
  const { bg, fg, border } = palette[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bg, borderColor: border, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
        <Text variant={size === 'sm' ? 'bodySmall' : 'subheading'} style={{ color: fg, fontWeight: '600' }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { minHeight: HIT_TARGET, paddingHorizontal: spacing.lg },
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
})
