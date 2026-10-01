import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Card, CardHeader, StatusBadge, Text } from '@/components'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme, type StatusTone } from '@/theme'
import { HealthStatus, HealthStatusLabel, type BusinessHealthDimensionDto, type BusinessHealthDto } from '@/types/api'
import { formatDateTime } from '@/utils/format'

/**
 * Business Health (M16's 6 deterministic dimensions). Every `summary`/`reasons` string is a
 * pre-formatted sentence the backend generated from real numbers — shown verbatim, never re-derived.
 * Health colors come from the shared StatusBadge tone map (Healthy/Attention/Critical), so they match
 * every other status in the app.
 */

const HEALTH_TONE: Record<HealthStatus, StatusTone> = {
  [HealthStatus.Healthy]: 'success',
  [HealthStatus.Attention]: 'warning',
  [HealthStatus.Critical]: 'danger',
}

export function HealthBadge({ status }: { status: HealthStatus }) {
  return <StatusBadge status={status} labels={HealthStatusLabel} />
}

function DimensionDetail({ dimension }: { dimension: BusinessHealthDimensionDto }) {
  return (
    <View style={styles.detail}>
      <Text variant="bodySmall" color="mutedForeground">
        {dimension.summary}
      </Text>
      {dimension.reasons.map((reason, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text variant="caption" color="mutedForeground">
            •
          </Text>
          <Text variant="caption" color="mutedForeground" style={styles.flex}>
            {reason}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Home's compact strip: one color-coded chip per dimension; tap a chip to expand its reasons. */
export function HealthStrip({ health }: { health: BusinessHealthDto }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState<string | null>(null)
  const selected = health.dimensions.find((d) => d.dimension === expanded)

  return (
    <Card>
      <CardHeader title={t('home.businessHealth')} subtitle={t('home.tapToExpand')} action={<HealthBadge status={health.overall} />} />
      {health.dimensions.length === 0 ? (
        <Text variant="bodySmall" color="mutedForeground">
          {t('cc.noDimensions')}
        </Text>
      ) : (
        <View style={styles.chips}>
          {health.dimensions.map((dimension) => {
            const tone = colors.tones[HEALTH_TONE[dimension.status]]
            const isOpen = expanded === dimension.dimension
            return (
              <Pressable
                key={dimension.dimension}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                accessibilityLabel={`${dimension.dimension}: ${HealthStatusLabel[dimension.status]}`}
                onPress={() => setExpanded(isOpen ? null : dimension.dimension)}
                style={[
                  styles.chip,
                  { backgroundColor: tone.background, borderColor: isOpen ? tone.dot : tone.border, borderWidth: isOpen ? 2 : 1 },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: tone.dot }]} />
                <Text variant="caption" style={{ color: tone.text, fontWeight: '600' }} numberOfLines={1}>
                  {dimension.dimension}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
      {selected ? (
        <View style={[styles.expanded, { borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <Text variant="subheading">{selected.dimension}</Text>
            <HealthBadge status={selected.status} />
          </View>
          <DimensionDetail dimension={selected} />
        </View>
      ) : null}
    </Card>
  )
}

/** Command Center's full section: every dimension with its summary and reasons. */
export function BusinessHealthSection({ health }: { health: BusinessHealthDto }) {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <Card>
      <CardHeader
        title={t('cc.health')}
        subtitle={t('cc.generatedAt', { time: formatDateTime(health.generatedAt) })}
        action={<HealthBadge status={health.overall} />}
      />
      {health.dimensions.length === 0 ? (
        <Text variant="bodySmall" color="mutedForeground">
          {t('cc.noDimensions')}
        </Text>
      ) : (
        health.dimensions.map((dimension) => (
          <View
            key={dimension.dimension}
            style={[styles.dimension, { borderColor: colors.border, borderStartColor: colors.tones[HEALTH_TONE[dimension.status]].dot }]}
          >
            <View style={styles.rowBetween}>
              <Text variant="subheading" style={styles.flex}>
                {dimension.dimension}
              </Text>
              <HealthBadge status={dimension.status} />
            </View>
            <DimensionDetail dimension={dimension} />
          </View>
        ))
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    minHeight: 34,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  expanded: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  detail: { gap: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.xs + 2 },
  dimension: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStartWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
})
