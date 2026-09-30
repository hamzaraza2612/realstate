import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { HealthStatus, HealthStatusLabel, type BusinessHealthDto } from '@/types/api'

// Accent stripe on each dimension tile, matching the StatusBadge tone for the same status.
const healthAccent: Record<HealthStatus, string> = {
  [HealthStatus.Healthy]: 'border-s-emerald-500',
  [HealthStatus.Attention]: 'border-s-amber-500',
  [HealthStatus.Critical]: 'border-s-red-500',
}

const healthIcon: Record<HealthStatus, typeof CheckCircle2> = {
  [HealthStatus.Healthy]: CheckCircle2,
  [HealthStatus.Attention]: AlertTriangle,
  [HealthStatus.Critical]: XCircle,
}

/** Health status pill — the shared `StatusBadge` (Healthy/Attention/Critical are part of its
 * single status→tone map), so health colors match every other status in the app. */
export function HealthBadge({ status }: { status: HealthStatus }) {
  return <StatusBadge status={status} labels={HealthStatusLabel} />
}

/** Renders `health.overall` and every `health.dimensions[]` entry as cards/badges — never as a
 * chat message. Each dimension's `reasons` are plain, pre-formatted sentences the backend already
 * generated from real numbers (see BusinessHealthDto's docstring); they're shown verbatim as a
 * short bullet list, not re-derived or reformatted here. */
export function BusinessHealthSection({ health }: { health: BusinessHealthDto }) {
  const OverallIcon = healthIcon[health.overall]
  return (
    <section>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Business Health</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Generated {formatDateTime(health.generatedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <OverallIcon
              className={
                health.overall === HealthStatus.Healthy
                  ? 'h-6 w-6 text-success'
                  : health.overall === HealthStatus.Attention
                    ? 'h-6 w-6 text-warning'
                    : 'h-6 w-6 text-destructive'
              }
            />
            <HealthBadge status={health.overall} />
          </div>
        </CardHeader>
        <CardContent>
          {health.dimensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No health dimensions are available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {health.dimensions.map((dimension) => (
                <div
                  key={dimension.dimension}
                  className={cn('flex flex-col gap-2 rounded-lg border border-s-4 bg-card p-4', healthAccent[dimension.status])}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{dimension.dimension}</span>
                    <HealthBadge status={dimension.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{dimension.summary}</p>
                  {dimension.reasons.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1 ps-4 text-xs text-muted-foreground">
                      {dimension.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
