import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '@/i18n'
import { HIT_TARGET, radius, spacing, useTheme } from '@/theme'
import { Icon } from './Icon'
import { Text } from './Text'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

/** A simple modal picker: a field that opens a bottom sheet of options. Deliberately not a
 * searchable combobox — later phases can add search where a list is long. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label?: string
  value: T | null
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
}) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <View style={styles.field}>
      {label ? (
        <Text variant="bodySmall" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label }}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.input, backgroundColor: colors.card }]}
      >
        <Text color={selected ? 'foreground' : 'mutedForeground'} style={styles.flex} numberOfLines={1}>
          {selected?.label ?? placeholder ?? t('common.selectPlaceholder')}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          {label ? (
            <Text variant="heading" style={styles.sheetTitle}>
              {label}
            </Text>
          ) : null}
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = item.value === value
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                  style={({ pressed }) => [styles.option, { borderColor: colors.border }, pressed && { backgroundColor: colors.muted }]}
                >
                  <Text style={styles.flex}>{item.label}</Text>
                  {isSelected ? <Icon name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              )
            }}
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.xs + 2 },
  label: { fontWeight: '600' },
  trigger: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: { marginTop: 'auto', maxHeight: '70%', borderTopLeftRadius: radius.lg + 4, borderTopRightRadius: radius.lg + 4, padding: spacing.lg },
  sheetTitle: { marginBottom: spacing.sm },
  option: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
