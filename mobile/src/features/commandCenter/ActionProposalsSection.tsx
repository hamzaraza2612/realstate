import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { extractErrorMessage } from '@/api/apiClient'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, LoadingState, StatusBadge, Text, useToast } from '@/components'
import { useDecideApproval } from '@/features/approvals/api'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme, type StatusTone } from '@/theme'
import { AiActionProposalStatus, AiActionProposalStatusLabel, type AiActionProposalDto } from '@/types/api'
import { formatDateTime, humanizeActionType } from '@/utils/format'
import { useAiActionProposals } from './api'
import { JsonDataView } from './JsonDataView'

/**
 * Recommended Actions — port of the web `ActionProposalsSection.tsx`. Pending/approved proposals
 * render as decision cards (target / action / expected effect / risk / status). Approve/Reject goes
 * through the EXISTING Approval Inbox — `POST /approvals/{id}/decide` with the proposal's own
 * `approvalRequestId` (`useDecideApproval`) — there is no second approve/reject mechanism.
 */

const RISK_TONE: Record<string, StatusTone> = { low: 'neutral', medium: 'warning', high: 'danger' }

const PENDING_STATUSES: readonly number[] = [AiActionProposalStatus.PendingApproval, AiActionProposalStatus.Approved]

export function ActionProposalsSection() {
  const { t } = useI18n()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const { data, isLoading, isError, refetch } = useAiActionProposals(1)
  const decideApproval = useDecideApproval()
  const [showHistory, setShowHistory] = useState(false)
  const [target, setTarget] = useState<{ proposal: AiActionProposalDto; approve: boolean } | null>(null)

  const items = data?.items ?? []
  const pending = items.filter((p) => PENDING_STATUSES.includes(p.status))
  const decided = items.filter((p) => !PENDING_STATUSES.includes(p.status))

  async function handleConfirm(comments: string) {
    if (!target?.proposal.approvalRequestId) return
    try {
      await decideApproval.mutateAsync({
        id: target.proposal.approvalRequestId,
        approve: target.approve,
        decisionComments: comments || null,
      })
      toast({ title: target.approve ? t('cc.actionApproved') : t('cc.actionRejected'), variant: 'success' })
      setTarget(null)
      void refetch()
    } catch (error) {
      toast({ title: t('cc.decisionFailed'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  return (
    <Card>
      <CardHeader title={t('cc.recommendedActions')} />
      {isLoading ? <LoadingState variant="cards" rows={2} /> : null}
      {isError && !data ? <ErrorState message={t('cc.loadProposalsError')} onRetry={() => refetch()} /> : null}

      {!isLoading && data ? (
        <>
          {pending.length === 0 ? (
            <EmptyState icon="sparkles-outline" title={t('cc.noPendingActionsTitle')} description={t('cc.noPendingActionsDescription')} />
          ) : (
            pending.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                offline={isOffline}
                onApprove={() => setTarget({ proposal, approve: true })}
                onReject={() => setTarget({ proposal, approve: false })}
              />
            ))
          )}

          {decided.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setShowHistory((v) => !v)} hitSlop={8}>
              <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                {showHistory ? t('cc.hideDecided', { count: decided.length }) : t('cc.showDecided', { count: decided.length })}
              </Text>
            </Pressable>
          ) : null}
          {showHistory ? decided.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} offline={isOffline} />) : null}
        </>
      ) : null}

      <ConfirmDialog
        visible={!!target}
        title={target?.approve ? t('cc.approveTitle') : t('cc.rejectTitle')}
        message={
          target?.approve
            ? t('cc.approveMessage', { action: target.proposal.actionType, effect: target.proposal.expectedEffect })
            : t('cc.rejectMessage')
        }
        confirmLabel={target?.approve ? t('common.approve') : t('common.reject')}
        destructive={!target?.approve}
        withComments
        commentsPlaceholder={t('approvals.decisionCommentsPlaceholder')}
        loading={decideApproval.isPending}
        disabled={isOffline}
        disabledReason={t('offline.actionDisabled')}
        onConfirm={handleConfirm}
        onCancel={() => setTarget(null)}
      />
    </Card>
  )
}

function ProposalCard({
  proposal,
  offline,
  onApprove,
  onReject,
}: {
  proposal: AiActionProposalDto
  offline: boolean
  onApprove?: () => void
  onReject?: () => void
}) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const isPending = proposal.status === AiActionProposalStatus.PendingApproval
  const canDecide = isPending && !!proposal.approvalRequestId
  const riskKey = proposal.riskLevel?.toLowerCase()
  const riskLabel = t(`risk.${riskKey}`) === `risk.${riskKey}` ? proposal.riskLevel : t(`risk.${riskKey}`)

  return (
    <View style={[styles.proposal, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="subheading">{humanizeActionType(proposal.actionType)}</Text>
          <Text variant="mono" color="mutedForeground" numberOfLines={1}>
            {proposal.actionType}
          </Text>
          {proposal.targetEntityType ? (
            <Text variant="caption" color="mutedForeground">
              {t('cc.target', { type: proposal.targetEntityType })}
            </Text>
          ) : null}
        </View>
        <View style={styles.badges}>
          <Badge label={t('cc.risk', { level: riskLabel })} tone={RISK_TONE[riskKey] ?? 'neutral'} />
          <StatusBadge status={proposal.status} labels={AiActionProposalStatusLabel} />
        </View>
      </View>

      <Text variant="bodySmall">{proposal.explanation}</Text>
      <Text variant="caption" color="mutedForeground">
        <Text variant="caption" style={{ fontWeight: '600' }}>
          {t('cc.expectedEffect')}{' '}
        </Text>
        {proposal.expectedEffect}
      </Text>

      {isPending ? (
        <Text variant="caption" color="mutedForeground">
          {t('cc.expires', { time: formatDateTime(proposal.expiresAt) })}
        </Text>
      ) : null}
      {proposal.executedAt ? (
        <Text variant="caption" color="mutedForeground">
          {t('cc.executedAt', { time: formatDateTime(proposal.executedAt) })}
        </Text>
      ) : null}
      {proposal.errorMessage ? (
        <Text variant="caption" color="destructive">
          {proposal.errorMessage}
        </Text>
      ) : null}
      {proposal.result != null ? (
        <View style={[styles.result, { backgroundColor: colors.muted }]}>
          <JsonDataView data={proposal.result} />
        </View>
      ) : null}

      {canDecide && onApprove && onReject ? (
        <>
          <View style={styles.actions}>
            <Button label={t('common.reject')} variant="outline" size="sm" onPress={onReject} disabled={offline} style={styles.flex} />
            <Button label={t('common.approve')} size="sm" onPress={onApprove} disabled={offline} style={styles.flex} />
          </View>
          {offline ? (
            <Text variant="caption" color="warning">
              {t('offline.actionDisabled')}
            </Text>
          ) : null}
        </>
      ) : null}
      {isPending && !proposal.approvalRequestId ? (
        <Text variant="caption" color="mutedForeground">
          {t('cc.cannotDecide')}
        </Text>
      ) : null}
      {proposal.status === AiActionProposalStatus.Approved ? (
        <Text variant="caption" color="mutedForeground">
          {t('cc.awaitingExecution')}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  proposal: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  badges: { alignItems: 'flex-end', gap: spacing.xs },
  result: { borderRadius: radius.sm, padding: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
})
