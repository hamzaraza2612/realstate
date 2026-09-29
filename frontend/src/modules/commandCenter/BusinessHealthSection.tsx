import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { HealthStatus, HealthStatusLabel, type BusinessHealthDto } from '@/types/api'

export const healthBadgeVariant: Record<HealthStatus, 'success' | 'warning' | 'destructive'> = {
  [HealthStatus.Healthy]: 'success',
  [HealthStatus.Attention]: 'warning',
  [HealthStatus.Critical]: 'destructive',
}

const healthIcon: Record<HealthStatus, typeof CheckCircle2> = {
  [HealthStatus.Healthy]: CheckCircle2,
  [HealthStatus.Attention]: AlertTriangle,
  [HealthStatus.Critical]: XCircle,
}

export function HealthBadge({ status }: { status: HealthStatus }) {
  return <Badge variant={healthBadgeVariant[status]}>{HealthStatusLabel[status]}</Badge>
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
                <div key={dimension.dimension} className="flex flex-col gap-2 rounded-md border p-3">
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
