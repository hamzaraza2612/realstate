import { Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/** Shown in place of the "Ask Your Business" panel or the "Recommended Actions" section when
 * `summary.aiProviderConfigured === false` — Business Health and Attention Items are deterministic
 * ERP data and always work regardless of whether an AI provider is configured; only the
 * conversational/tool-driven parts of the Command Center depend on one. */
export function AiUnavailableNotice({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <Info className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p>AI is not configured for this deployment. Ask your administrator to set up an AI provider.</p>
        </div>
      </CardContent>
    </Card>
  )
}
