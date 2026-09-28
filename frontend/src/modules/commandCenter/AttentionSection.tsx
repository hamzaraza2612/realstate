import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/StateViews'
import { entityDetailRoute } from './entityLinks'
import { HealthBadge } from './BusinessHealthSection'
import type { AttentionItemDto } from '@/types/api'

/** Renders `summary.attentionItems[]` as insight cards — every item is deterministic, rule-generated
 * business data (see AttentionItemDto's docstring), never an AI-authored alert. Also doubles as
 * "Recent AI Insights": there is no separate insights feed, so this section is the whole of it. */
export function AttentionSection({ items }: { items: AttentionItemDto[] }) {
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>What Needs Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="Nothing needs attention" description="No business rule has flagged anything right now." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {items.map((item, index) => {
                const link = entityDetailRoute(item.entityType, item.entityId)
                return (
                  <div key={index} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.category}</span>
                        <h4 className="text-sm font-semibold">
                          {link ? (
                            <Link to={link} className="hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </h4>
                      </div>
                      <HealthBadge status={item.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.summary}</p>
                    {item.facts.length > 0 && (
                      <ul className="list-disc space-y-0.5 ps-4 text-xs text-muted-foreground">
                        {item.facts.map((fact, factIndex) => (
                          <li key={factIndex}>{fact}</li>
                        ))}
                      </ul>
                    )}
                    {item.suggestedAction && (
                      <p className="text-xs font-medium text-primary">Suggested: {item.suggestedAction}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
