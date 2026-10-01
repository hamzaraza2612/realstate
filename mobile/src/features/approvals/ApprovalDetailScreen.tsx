import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/api/apiClient'
import { Button, Card, ConfirmDialog, ErrorState, LoadingState, StatusBadge, Text, useToast } from '@/components'
import { Screen } from '@/components/Screen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { ApprovalStatus, ApprovalStatusLabel, type ApprovalRequestDto } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { APPROVALS_KEY, useApprovalRequest, useDecideApproval } from './api'

/** Review one approval request and Approve/Reject it via `POST /approvals/{id}/decide` (who may
 * decide is enforced server-side in ApprovalService.DecideAsync). */
export function ApprovalDetailScreen({ id }: { id: string }) {
  const { t } = useI18n()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { isOffline } = useNetworkStatus()
  const canFetch = usePermission('approvals.view')
  const seed = queryClient.getQueryData<ApprovalRequestDto>([...APPROVALS_KEY, 'detail', id])
  const request = useApprovalRequest(id, { canFetch, seed })
  const decide = useDecideApproval()
  const [decision, setDecision] = useState<boolean | null>(null)

  if (request.isLoading) return <Screen edges={[]}><LoadingState variant="cards" rows={2} /></Screen>
  if (!request.data) {
    return (
      <Screen edges={[]}>
        <ErrorState message={request.isError ? t('approvals.loadError') : t('approvals.notFound')} onRetry={canFetch ? () => request.refetch() : undefined} />
      </Screen>
    )
  }

  const item = request.data
  const isPending = item.status === ApprovalStatus.Pending

  async function handleConfirm(comments: string) {
    if (decision === null) return
    try {
      await decide.mutateAsync({ id: item.id, approve: decision, decisionComments: comments || null })
      toast({ title: decision ? t('approvals.approved') : t('approvals.rejected'), variant: 'success' })
      setDecision(null)
      router.back()
    } catch (error) {
      toast({ title: t('approvals.decideError'), description: extractErrorMessage(error, t('common.somethingWentWrong')), variant: 'error' })
    }
  }

  return (
    <Screen edges={[]}>
      <Card>
        <View style={styles.titleRow}>
          <Text variant="heading" style={styles.flex}>
            {item.entityType}
          </Text>
          <StatusBadge status={item.status} labels={ApprovalStatusLabel} />
        </View>
        <Field label={t('approvals.entity')} value={item.entityType} />
        <Field label={t('approvals.entityId')} value={item.entityId} mono />
        <Field label={t('approvals.requestedBy')} value={item.requestedByUserName ?? t('approvals.unknownUser')} />
        <Field label={t('approvals.requestedAt')} value={formatDateTime(item.createdAt)} />
        <Field label={t('approvals.approver')} value={item.approverUserName ?? t('approvals.anyApprover')} />
        {item.requiredPermission ? <Field label={t('approvals.requiredPermission')} value={item.requiredPermission} mono /> : null}
      </Card>

      <Card>
        <Text variant="overline" color="mutedForeground">
          {t('approvals.requestComments')}
        </Text>
        <Text variant="body" color={item.requestComments ? 'foreground' : 'mutedForeground'}>
          {item.requestComments ?? t('approvals.noComments')}
        </Text>
      </Card>

      {!isPending ? (
        <Card>
          <Field label={t('approvals.decidedBy')} value={item.decidedByUserName ?? '—'} />
          <Field label={t('approvals.decidedAt')} value={formatDateTime(item.decidedAt)} />
          {item.decisionComments ? <Field label={t('approvals.decisionComments')} value={item.decisionComments} /> : null}
        </Card>
      ) : (
        <View style={styles.actions}>
          <Button label={t('common.reject')} variant="outline" icon="close" onPress={() => setDecision(false)} disabled={isOffline} style={styles.flex} />
          <Button label={t('common.approve')} icon="checkmark" onPress={() => setDecision(true)} disabled={isOffline} style={styles.flex} />
        </View>
      )}
      {isPending && isOffline ? (
        <Text variant="caption" color="warning">
          {t('offline.actionDisabled')}
        </Text>
      ) : null}

      <ConfirmDialog
        visible={decision !== null}
        title={decision ? t('approvals.approveTitle') : t('approvals.rejectTitle')}
        message={decision ? t('approvals.approveMessage', { entity: item.entityType }) : t('approvals.rejectMessage', { entity: item.entityType })}
        confirmLabel={decision ? t('common.approve') : t('common.reject')}
        destructive={decision === false}
        withComments
        commentsPlaceholder={t('approvals.decisionCommentsPlaceholder')}
        loading={decide.isPending}
        disabled={isOffline}
        disabledReason={t('offline.actionDisabled')}
        onConfirm={handleConfirm}
        onCancel={() => setDecision(null)}
      />
    </Screen>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      <Text variant={mono ? 'mono' : 'body'} selectable>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  field: { gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.md },
})
