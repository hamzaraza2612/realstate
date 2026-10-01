import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardHeader, EmptyState, ErrorState, Icon, LastUpdated, LoadingState, PageHeader, Screen, Text } from '@/components'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { ActionProposalsSection } from './ActionProposalsSection'
import { AiUnavailableNotice } from './AiUnavailableNotice'
import { getAiErrorCode, useCommandCenterSummary } from './api'
import { AskYourBusinessCard } from './AskYourBusinessCard'
import { AttentionList } from './AttentionList'
import { BusinessHealthSection } from './BusinessHealth'

/**
 * The mobile Business Command Center: the four web sections (Business Health / What Needs Attention
 * / Ask Your Business / Recommended Actions) on one scrollable screen, all from the same M16
 * endpoints the web `CommandCenterPage` uses. The model-driven sections are gated on
 * `summary.aiProviderConfigured` exactly like web — Health/Attention always render.
 */
export function CommandCenterScreen() {
  const { t } = useI18n()
  const canView = usePermission('ai.view')
  const queryClient = useQueryClient()
  const { data: summary, isLoading, isError, error, refetch, dataUpdatedAt } = useCommandCenterSummary(canView)
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['ai'] })
    setRefreshing(false)
  }

  if (!canView) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="lock-closed-outline" title={t('cc.noAccessTitle')} description={t('cc.noAccessDescription')} />
      </Screen>
    )
  }

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader title={t('cc.title')} description={t('cc.description')} />
      {summary ? <LastUpdated updatedAt={dataUpdatedAt} /> : null}

      {isLoading ? <LoadingState variant="cards" rows={3} /> : null}

      {isError && !summary ? (
        getAiErrorCode(error) === 'feature_not_entitled' ? (
          <NotEntitledCard />
        ) : (
          <ErrorState message={t('cc.loadError')} onRetry={() => refetch()} />
        )
      ) : null}

      {summary ? (
        <>
          <BusinessHealthSection health={summary.health} />
          <Card>
            <CardHeader title={t('cc.attention')} />
            <AttentionList items={summary.attentionItems} />
          </Card>
          {summary.aiProviderConfigured ? (
            <AskYourBusinessCard conversations={summary.recentConversations} />
          ) : (
            <AiUnavailableNotice title={t('cc.ask')} />
          )}
          {summary.aiProviderConfigured ? <ActionProposalsSection /> : <AiUnavailableNotice title={t('cc.recommendedActions')} />}
        </>
      ) : null}
    </Screen>
  )
}

export function NotEntitledCard() {
  const { t } = useI18n()
  const { colors } = useTheme()
  return (
    <Card>
      <View style={styles.locked}>
        <Icon name="lock-closed-outline" size={28} color={colors.mutedForeground} />
        <Text variant="subheading" style={styles.center}>
          {t('cc.notEntitledTitle')}
        </Text>
        <Text variant="bodySmall" color="mutedForeground" style={styles.center}>
          {t('cc.notEntitledDescription')}
        </Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  center: { textAlign: 'center' },
})
