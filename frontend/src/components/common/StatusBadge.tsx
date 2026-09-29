import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * The ONE shared status pill for the whole ERP (Milestone 17). Before this, ~72 pages each kept
 * their own ad-hoc `statusVariant` map, so the same status (e.g. "Approved") could get a
 * different color on different pages. The tone for every common status now lives in exactly one
 * place — `STATUS_TONES` below — keyed by the normalized status *name*, so it works for every
 * domain enum without per-module maps.
 *
 * i18n: the common vocabulary is translated via `status.<name>` keys (lib/i18n); any other status
 * renders its English label unchanged.
 *
 * Accessibility: always renders the text label next to the colored dot/pill — color is never the
 * only signal.
 *
 * Usage with the numeric enums in `types/api.ts` (every one ships a `…Label` record):
 *   <StatusBadge status={booking.status} labels={BookingStatusLabel} />
 * or with a plain string status:
 *   <StatusBadge status="Past Due" />
 * `tone` overrides the lookup for the rare status whose meaning is domain-specific.
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

// Explicit light/dark pairs (rather than `text-warning` on a 10% tint) so small badge text keeps
// a readable contrast ratio in both themes.
const toneClasses: Record<StatusTone, { pill: string; dot: string }> = {
  success: {
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  warning: {
    pill: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  danger: {
    pill: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    dot: 'bg-red-500',
  },
  info: {
    pill: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  neutral: {
    pill: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
}

/** Single source of truth: normalized status name (lowercase, no spaces/underscores/hyphens) →
 * tone. Covers the status vocabulary used across `types/api.ts`'s `…StatusLabel` records. */
const STATUS_TONES: Record<string, StatusTone> = {
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

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, '')
}

/** Looks up the shared tone for a status name; unknown statuses fall back to `neutral`. */
function statusTone(status: string): StatusTone {
  return STATUS_TONES[normalize(status)] ?? 'neutral'
}

export function StatusBadge({
  status,
  labels,
  tone,
  className,
}: {
  /** Either the status name/label itself, or a numeric enum value resolved through `labels`. */
  status: string | number
  /** A `types/api.ts` `…Label` record, used to turn a numeric enum value into its display name. */
  labels?: Record<string | number, string>
  /** Overrides the shared lookup — only for a status whose meaning genuinely differs by domain. */
  tone?: StatusTone
  className?: string
}) {
  const { t, language } = useI18n()
  const label = labels?.[status] ?? String(status)
  const classes = toneClasses[tone ?? statusTone(label)]
  // In a non-English UI, common statuses are translated via `status.<normalized name>`; anything
  // else keeps the English label from `types/api.ts` (t() returns the key itself when missing).
  // English always shows the enum's own label verbatim.
  const translationKey = `status.${normalize(label)}`
  const translated = language === 'en' ? translationKey : t(translationKey)
  const display = translated === translationKey ? label : translated
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        classes.pill,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 shrink-0 rounded-full', classes.dot)} />
      {display}
    </span>
  )
}
