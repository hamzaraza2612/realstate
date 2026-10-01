import { StyleSheet, View } from 'react-native'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme, type StatusTone } from '@/theme'
import { Text } from './Text'

/**
 * The ONE shared status pill — a direct port of the web `components/common/StatusBadge.tsx`
 * (Milestone 17). Tone is looked up from the normalized status NAME in `STATUS_TONES` below, which
 * is copied verbatim from the web file so the same status gets the same color on both clients.
 * Always renders a text label next to the colored dot — color is never the only signal.
 */

/** Single source of truth: normalized status name (lowercase, no spaces/underscores/hyphens) →
 * tone. Ported unchanged from `frontend/src/components/common/StatusBadge.tsx`. */
export const STATUS_TONES: Record<string, StatusTone> = {
  // Done / good
  approved: 'success',
  active: 'success',
  completed: 'success',
  paid: 'success',
  confirmed: 'success',
  available: 'success',
  won: 'success',
  succeeded: 'success',
  resolved: 'success',
  received: 'success',
  posted: 'success',
  executed: 'success',
  sold: 'success',
  healthy: 'success',
  handedover: 'success',
  allocated: 'success',

  // Needs attention / waiting
  pending: 'warning',
  pendingapproval: 'warning',
  partiallypaid: 'warning',
  partiallyreceived: 'warning',
  onhold: 'warning',
  paused: 'warning',
  held: 'warning',
  expired: 'warning',
  attention: 'warning',
  maintenance: 'warning',
  undermaintenance: 'warning',
  underrenovation: 'warning',

  // Bad / blocked
  rejected: 'danger',
  overdue: 'danger',
  pastdue: 'danger',
  suspended: 'danger',
  failed: 'danger',
  lost: 'danger',
  terminated: 'danger',
  forfeited: 'danger',
  blocked: 'danger',
  critical: 'danger',

  // In flight / informational
  new: 'info',
  open: 'info',
  submitted: 'info',
  sent: 'info',
  issued: 'info',
  inprogress: 'info',
  ongoing: 'info',
  underconstruction: 'info',
  assigned: 'info',
  acknowledged: 'info',
  reserved: 'info',
  booked: 'info',
  occupied: 'info',
  contacted: 'info',
  qualified: 'info',
  proposalsent: 'info',
  negotiation: 'info',
  trial: 'info',
  trialing: 'info',
  planned: 'info',
  planning: 'info',

  // Inactive / closed-out
  draft: 'neutral',
  inactive: 'neutral',
  cancelled: 'neutral',
  canceled: 'neutral',
  closed: 'neutral',
  ended: 'neutral',
  void: 'neutral',
  refunded: 'neutral',
  partiallyrefunded: 'neutral',
}

export function normalizeStatus(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, '')
}

/** Looks up the shared tone for a status name; unknown statuses fall back to `neutral`. */
export function statusTone(status: string): StatusTone {
  return STATUS_TONES[normalizeStatus(status)] ?? 'neutral'
}

/** A plain tone pill (no status lookup) — for things like risk levels or counts. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { colors } = useTheme()
  const toneColors = colors.tones[tone]
  return (
    <View
      style={[styles.pill, { backgroundColor: toneColors.background, borderColor: toneColors.border }]}
      accessible
      accessibilityLabel={label}
    >
      <View style={[styles.dot, { backgroundColor: toneColors.dot }]} />
      <Text variant="caption" style={{ color: toneColors.text, fontWeight: '600' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function StatusBadge({
  status,
  labels,
  tone,
}: {
  /** Either the status name/label itself, or a numeric enum value resolved through `labels`. */
  status: string | number
  /** A `types/api.ts` `…Label` record, used to turn a numeric enum value into its display name. */
  labels?: Record<string | number, string>
  /** Overrides the shared lookup — only for a status whose meaning genuinely differs by domain. */
  tone?: StatusTone
}) {
  const { t, language } = useI18n()
  const label = labels?.[status] ?? String(status)
  // Same translation rule as web: common statuses via `status.<normalized>`, else the English label.
  const key = `status.${normalizeStatus(label)}`
  const translated = language === 'en' ? key : t(key)
  const display = translated === key ? label : translated
  return <Badge label={display} tone={tone ?? statusTone(label)} />
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
})
