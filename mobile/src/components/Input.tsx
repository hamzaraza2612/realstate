import { forwardRef } from 'react'
import { I18nManager, StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { radius, spacing, typography, useTheme } from '@/theme'
import { Text } from './Text'

export interface InputProps extends TextInputProps {
  label?: string
  hint?: string
  error?: string
}

/** Labeled text field with hint and error lines — the mobile `Input` + `Label` pair. */
export const Input = forwardRef<TextInput, InputProps>(function Input({ label, hint, error, style, multiline, ...props }, ref) {
  const { colors } = useTheme()
  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="bodySmall" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        {...props}
        style={[
          styles.input,
          typography.body,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.input,
            textAlign: I18nManager.isRTL ? 'right' : 'left',
          },
          multiline && styles.multiline,
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color="destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="mutedForeground">
          {hint}
        </Text>
      ) : null}
    </View>
  )
})

const styles = StyleSheet.create({
  field: { gap: spacing.xs + 2 },
  label: { fontWeight: '600' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
})
