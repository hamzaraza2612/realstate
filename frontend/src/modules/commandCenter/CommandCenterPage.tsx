import { Lock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, LoadingState } from '@/components/common/StateViews'
import { Card, CardContent } from '@/components/ui/card'
import { ActionProposalsSection } from './ActionProposalsSection'
import { AiUnavailableNotice } from './AiUnavailableNotice'
import { getAiErrorCode, useCommandCenterSummary } from './api'
import { AttentionSection } from './AttentionSection'
import { BusinessHealthSection } from './BusinessHealthSection'
import { ConversationPanel } from './ConversationPanel'

/** The Business Command Center — Milestone 16's AI Business Intelligence landing page. Structured
 * as a management dashboard (Business Health, What Needs Attention, Ask Your Business, Recommended
 * Actions), never as a generic chat app: see docs/AI_ARCHITECTURE.md and each section's own
 * docstring. "Recent AI Insights" is deliberately not a separate section here — What Needs Attention
 * already renders every real AttentionItemDto, and the Ask Your Business panel already lists past
 * conversations; a further "insights feed" would just duplicate one of those with no real data
 * source of its own. */
export function CommandCenterPage() {
  const { data: summary, isLoading, isError, error, refetch } = useCommandCenterSummary()

  if (isLoading) return <LoadingState label="Loading the Command Center…" />

  if (isError) {
    if (getAiErrorCode(error) === 'feature_not_entitled') {
      return (
        <div>
          <PageHeader title="Business Command Center" description="AI-powered business health, insights and recommended actions." />
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-base font-semibold">AI is not included in your current plan</p>
              <p className="max-w-md text-sm text-muted-foreground">
                The Business Command Center requires the AI add-on. Contact your organization owner or upgrade your plan to enable it.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return <ErrorState message="Could not load the Business Command Center." onRetry={() => refetch()} />
  }

  if (!summary) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Business Command Center" description="AI-powered business health, insights and recommended actions." />

      <BusinessHealthSection health={summary.health} />
      <AttentionSection items={summary.attentionItems} />

      {summary.aiProviderConfigured ? <ConversationPanel /> : <AiUnavailableNotice title="Ask Your Business" />}
      {summary.aiProviderConfigured ? <ActionProposalsSection /> : <AiUnavailableNotice title="Recommended Actions" />}
    </div>
  )
}
