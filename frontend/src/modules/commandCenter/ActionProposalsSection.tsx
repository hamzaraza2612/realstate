import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/StateViews'
import { StatusBadge } from '@/components/common/StatusBadge'
import { toast } from '@/components/ui/use-toast'
import { extractErrorMessage } from '@/lib/apiClient'
import { formatDateTime } from '@/lib/utils'
import { useDecideApproval } from '@/modules/approvals/api'
import { AiActionProposalStatus, AiActionProposalStatusLabel, type AiActionProposalDto } from '@/types/api'
import { useAiActionProposals } from './api'
import { entityDetailRoute } from './entityLinks'
import { JsonDataView } from './JsonDataView'
import { Link } from 'react-router-dom'

const riskVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
}

/** "crm.lead.assign" / "assign_lead" / "AssignLead" -> "Assign lead" — display-only; the raw
 * action type is still shown underneath in monospace. */
function humanizeActionType(actionType: string) {
  const last = actionType.split('.').filter(Boolean).pop() ?? actionType
  const words = last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : actionType
}

const PENDING_STATUSES: readonly number[] = [AiActionProposalStatus.PendingApproval, AiActionProposalStatus.Approved]

/** Renders pending/approved AiActionProposals as decision cards. Approving/rejecting reuses the
 * EXISTING generic Approval Inbox (`useDecideApproval`, POST /approvals/{id}/decide) via the
 * proposal's own `approvalRequestId` — there is no second approve/reject mechanism here. */
export function ActionProposalsSection() {
  const { data, isLoading, isError, refetch } = useAiActionProposals(1)
  const [showHistory, setShowHistory] = useState(false)
  const [decisionTarget, setDecisionTarget] = useState<{ proposal: AiActionProposalDto; approve: boolean } | null>(null)

  const items = data?.items ?? []
  const pending = items.filter((p) => PENDING_STATUSES.includes(p.status))
  const decided = items.filter((p) => !PENDING_STATUSES.includes(p.status))

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <LoadingState label="Loading action proposals…" />}
          {isError && <ErrorState message="Could not load action proposals." onRetry={() => refetch()} />}

          {!isLoading && !isError && (
            <>
              {pending.length === 0 ? (
                <EmptyState title="No actions awaiting your decision" description="Proposals the AI creates during a conversation will show up here." />
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {pending.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onApprove={() => setDecisionTarget({ proposal, approve: true })}
                      onReject={() => setDecisionTarget({ proposal, approve: false })}
                    />
                  ))}
                </div>
              )}

              {decided.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {showHistory ? 'Hide' : 'Show'} decided actions ({decided.length})
                  </button>
                  {showHistory && (
                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {decided.map((proposal) => (
                        <ProposalCard key={proposal.id} proposal={proposal} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DecisionDialog target={decisionTarget} onOpenChange={(open) => !open && setDecisionTarget(null)} onDecided={() => refetch()} />
    </section>
  )
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: AiActionProposalDto
  onApprove?: () => void
  onReject?: () => void
}) {
  const link = entityDetailRoute(proposal.targetEntityType, proposal.targetEntityId)
  const canDecide = proposal.status === AiActionProposalStatus.PendingApproval && !!proposal.approvalRequestId

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{humanizeActionType(proposal.actionType)}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{proposal.actionType}</p>
          {(proposal.targetEntityType || link) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {proposal.targetEntityType && <>Target: {proposal.targetEntityType}</>}
              {proposal.targetEntityType && link && ' · '}
              {link && (
                <Link to={link} className="text-primary hover:underline">
                  View related record
                </Link>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={riskVariant[proposal.riskLevel] ?? 'secondary'}>{proposal.riskLevel} risk</Badge>
          <StatusBadge status={proposal.status} labels={AiActionProposalStatusLabel} />
        </div>
      </div>

      <p className="text-sm">{proposal.explanation}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Expected effect: </span>
        {proposal.expectedEffect}
      </p>

      {proposal.status === AiActionProposalStatus.PendingApproval && (
        <p className="text-xs text-muted-foreground">Expires {formatDateTime(proposal.expiresAt)}</p>
      )}
      {proposal.executedAt && <p className="text-xs text-muted-foreground">Executed {formatDateTime(proposal.executedAt)}</p>}
      {proposal.errorMessage && <p className="text-xs text-destructive">{proposal.errorMessage}</p>}
      {proposal.result != null && (
        <div className="rounded-md bg-muted/40 p-2">
          <JsonDataView data={proposal.result} />
        </div>
      )}

      {canDecide && (
        <div className="mt-1 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onReject}>
            Reject
          </Button>
          <Button size="sm" onClick={onApprove}>
            Approve
          </Button>
        </div>
      )}
      {proposal.status === AiActionProposalStatus.Approved && (
        <p className="text-end text-xs text-muted-foreground">Approved — awaiting execution.</p>
      )}
    </div>
  )
}

function DecisionDialog({
  target,
  onOpenChange,
  onDecided,
}: {
  target: { proposal: AiActionProposalDto; approve: boolean } | null
  onOpenChange: (open: boolean) => void
  onDecided: () => void
}) {
  const decideApproval = useDecideApproval()
  const [comments, setComments] = useState('')

  function handleOpenChange(open: boolean) {
    if (!open) setComments('')
    onOpenChange(open)
  }

  async function handleConfirm() {
    if (!target?.proposal.approvalRequestId) return
    try {
      await decideApproval.mutateAsync({
        id: target.proposal.approvalRequestId,
        approve: target.approve,
        decisionComments: comments || null,
      })
      toast({ title: target.approve ? 'Action approved' : 'Action rejected', variant: 'success' })
      handleOpenChange(false)
      onDecided()
    } catch (error) {
      toast({
        title: target.approve ? 'Could not approve action' : 'Could not reject action',
        description: extractErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.approve ? 'Approve this action' : 'Reject this action'}</DialogTitle>
          <DialogDescription>
            {target?.approve
              ? `Approving lets the AI execute "${target.proposal.actionType}". ${target.proposal.expectedEffect}`
              : `Rejecting cancels this proposed action. It will not be executed.`}
          </DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Decision comments (optional)" value={comments} onChange={(e) => setComments(e.target.value)} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={target?.approve ? 'default' : 'destructive'} onClick={handleConfirm} disabled={decideApproval.isPending}>
            {decideApproval.isPending ? 'Please wait…' : target?.approve ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
