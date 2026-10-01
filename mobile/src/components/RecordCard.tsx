import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { spacing, useTheme } from '@/theme'
import { Card } from './Card'
import { Icon } from './Icon'
import { Text } from './Text'

/**
 * One row of a module list (a lead, a booking, a unit, …) — the same card layout as the Approvals
 * inbox rows: title + up to two detail lines on the start side, status badge / amount + chevron on
 * the end side. The whole card is the touch target.
 */
export function RecordCard({
  title,
  subtitle,
  meta,
  badge,
  amount,
  onPress,
}: {
  title: string
  subtitle?: string | null
  meta?: string | null
  badge?: ReactNode
  amount?: string | null
  onPress?: () => void
}) {
  const { colors } = useTheme()
  return (
    <Card onPress={onPress} accessibilityLabel={[title, subtitle, meta, amount].filter(Boolean).join('. ')}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text variant="subheading" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" color="mutedForeground" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="caption" color="mutedForeground" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <View style={styles.trailing}>
          {badge}
          {amount ? (
            <Text variant="bodySmall" style={styles.amount} numberOfLines={1}>
              {amount}
            </Text>
          ) : null}
        </View>
        {onPress ? <Icon name="chevron-forward" size={18} color={colors.mutedForeground} /> : null}
      </View>
    </Card>
  )
}

/** A compact line inside a detail screen's embedded section (installments, PO lines, tasks, …).
 * With `onPress` the row opens that record (chevron shown). */
export function SectionRow({
  title,
  subtitle,
  trailing,
  footer,
  onPress,
}: {
  title: string
  subtitle?: string | null
  trailing?: ReactNode
  footer?: ReactNode
  onPress?: () => void
}) {
  const { colors } = useTheme()
  const content = (
    <>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text variant="body" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="mutedForeground" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        {onPress ? <Icon name="chevron-forward" size={18} color={colors.mutedForeground} /> : null}
      </View>
      {footer}
    </>
  )
  if (!onPress) return <View style={styles.sectionRow}>{content}</View>
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [styles.sectionRow, pressed && { backgroundColor: colors.muted }]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  main: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: spacing.xs, maxWidth: '45%' },
  amount: { fontWeight: '600' },
  sectionRow: { paddingVertical: spacing.sm, gap: spacing.xs },
})
