import { StyleSheet, View } from 'react-native'
import { EmptyState, Text } from '@/components'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme } from '@/theme'
import type { AttentionItemDto } from '@/types/api'
import { HealthBadge } from './BusinessHealth'

/** "What Needs Attention" cards — every item is deterministic, rule-generated business data
 * (never an AI-authored alert), rendered as-is. Deep links into entity detail screens arrive with
 * the Phase 2 module screens; until then items are informational. */
export function AttentionList({ items, compact }: { items: AttentionItemDto[]; compact?: boolean }) {
  const { t } = useI18n()
  const { colors } = useTheme()

  if (items.length === 0) {
    return <EmptyState icon="checkmark-done-outline" title={t('cc.attentionEmptyTitle')} description={t('cc.attentionEmptyDescription')} />
  }

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item.category}-${index}`} style={[styles.item, { borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text variant="overline" color="mutedForeground">
                {item.category}
              </Text>
              <Text variant="subheading">{item.title}</Text>
            </View>
            <HealthBadge status={item.severity} />
          </View>
          <Text variant="bodySmall" color="mutedForeground" numberOfLines={compact ? 2 : undefined}>
            {item.summary}
          </Text>
          {!compact &&
            item.facts.map((fact, factIndex) => (
              <View key={factIndex} style={styles.bulletRow}>
                <Text variant="caption" color="mutedForeground">
                  •
                </Text>
                <Text variant="caption" color="mutedForeground" style={styles.flex}>
                  {fact}
                </Text>
              </View>
            ))}
          {item.suggestedAction ? (
            <Text variant="caption" color="primary" style={styles.suggested}>
              {t('cc.suggested', { action: item.suggestedAction })}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  item: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs + 2 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.xs + 2 },
  suggested: { fontWeight: '600' },
})
