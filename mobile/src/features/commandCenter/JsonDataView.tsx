import { StyleSheet, View } from 'react-native'
import { Text } from '@/components'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme } from '@/theme'
import { formatNumber, humanizeKey } from '@/utils/format'

/**
 * Renders an arbitrary, tool-sourced JSON value (an AI message's `facts`, an action proposal's
 * `result`) as structured rows — the mobile port of the web `JsonDataView.tsx`. Deliberately
 * generic: the data has no fixed DTO shape, so keys are only humanized, never assumed. This is the
 * visual "Sources" counterpart to the assistant's prose, and must stay visually separate from it
 * (docs/AI_ARCHITECTURE.md's hallucination defense). Arrays of objects render as stacked mini-cards
 * rather than the web's table, which doesn't fit a phone width.
 */

const MAX_ITEMS = 10

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function usePrimitiveFormatter() {
  const { t } = useI18n()
  return (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'number') return formatNumber(value, { maximumFractionDigits: 2 })
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no')
    return String(value)
  }
}

function KeyValueRows({ data, depth }: { data: Record<string, unknown>; depth: number }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const entries = Object.entries(data)
  if (entries.length === 0) return <Text variant="caption" color="mutedForeground">{t('common.noData')}</Text>
  return (
    <View>
      {entries.map(([key, value], index) => (
        <View
          key={key}
          style={[styles.kvRow, index < entries.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
        >
          <Text variant="caption" color="mutedForeground" style={styles.key}>
            {humanizeKey(key)}
          </Text>
          <View style={styles.value}>
            <JsonDataView data={value} depth={depth + 1} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function JsonDataView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const format = usePrimitiveFormatter()

  if (data === null || data === undefined) return <Text variant="caption" color="mutedForeground">—</Text>

  if ((isPlainObject(data) || Array.isArray(data)) && depth >= 3) {
    return (
      <Text variant="mono" color="mutedForeground" numberOfLines={3}>
        {JSON.stringify(data)}
      </Text>
    )
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <Text variant="caption" color="mutedForeground">{t('common.noData')}</Text>
    if (data.every((item) => !isPlainObject(item) && !Array.isArray(item))) {
      return <Text variant="caption" style={styles.endAligned}>{data.map(format).join(', ')}</Text>
    }
    const visible = data.slice(0, MAX_ITEMS)
    return (
      <View style={styles.stack}>
        {visible.map((item, index) => (
          <View key={index} style={[styles.miniCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {isPlainObject(item) ? <KeyValueRows data={item} depth={depth} /> : <JsonDataView data={item} depth={depth + 1} />}
          </View>
        ))}
        {data.length > visible.length ? (
          <Text variant="caption" color="mutedForeground">
            {t('common.more', { count: data.length - visible.length })}
          </Text>
        ) : null}
      </View>
    )
  }

  if (isPlainObject(data)) return <KeyValueRows data={data} depth={depth} />

  return <Text variant="caption" style={[styles.endAligned, { fontWeight: '600' }]}>{format(data)}</Text>
}

const styles = StyleSheet.create({
  kvRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  key: { flexShrink: 0, maxWidth: '45%' },
  value: { flex: 1, alignItems: 'flex-end' },
  // The value column is `alignItems: 'flex-end'`, which already mirrors in RTL; no explicit
  // left/right text alignment here so Arabic layouts stay correct.
  endAligned: { flexShrink: 1 },
  stack: { gap: spacing.sm, alignSelf: 'stretch' },
  miniCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
})
