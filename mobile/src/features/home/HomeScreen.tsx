import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { extractErrorCode } from '@/api/apiClient'
import { useAuth } from '@/auth'
import { Button, Card, CardHeader, EmptyState, ErrorState, Icon, LastUpdated, LoadingState, StatCard, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { usePendingApprovalCount } from '@/features/approvals/api'
import { AiUnavailableNotice } from '@/features/commandCenter/AiUnavailableNotice'
import { useAiActionProposals, useCommandCenterSummary, getAiErrorCode } from '@/features/commandCenter/api'
import { AttentionList } from '@/features/commandCenter/AttentionList'
import { HealthStrip } from '@/features/commandCenter/BusinessHealth'
import { NotEntitledCard } from '@/features/commandCenter/CommandCenterScreen'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'
import { useTenantLocalization } from '@/i18n/tenantLocalization'
import { spacing, useTheme } from '@/theme'
import { AiActionProposalStatus } from '@/types/api'
import { formatNumber, money } from '@/utils/format'
import { useHomeKeyFigures } from './api'

/**
 * Management Home — built for a manager glancing at a phone between meetings (docs/
 * MOBILE_ARCHITECTURE.md "Management Home"): (1) Business Health strip, (2) top-3 What Needs
 * Attention, (3) 2-3 KPI tiles, (4) Approvals-pending count, (5) Command Center entry. Every number
 * is an authoritative backend figure (`/ai/command-center/summary`, `/reports/executive`,
 * `/approvals/inbox` meta.total) — nothing is computed on the device.
 */
export function HomeScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  // Re-renders money once the tenant currency arrives; also gates the KPI query so "today" is
  // computed in the tenant's timezone rather than the device's.
  const localization = useTenantLocalization()
  const localizationSettled = localization.status === 'loaded' || localization.status === 'error'
  const canViewAi = usePermission('ai.view')
  const canViewReports = usePermission('reports.view')

  const summary = useCommandCenterSummary(canViewAi)
  const aiConfigured = summary.data?.aiProviderConfigured === true
  const proposals = useAiActionProposals(1, canViewAi && aiConfigured)
  const keyFigures = useHomeKeyFigures(canViewReports && localizationSettled)
  const approvals = usePendingApprovalCount()
  const [refreshing, setRefreshing] = useState(false)

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ai'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: ['approvals'] }),
    ])
    setRefreshing(false)
  }

  const pendingProposals = proposals.data?.items.filter((p) => p.status === AiActionProposalStatus.PendingApproval).length ?? 0
  const firstName = user?.fullName?.split(' ')[0] ?? ''

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.greeting}>
        <Text variant="title" accessibilityRole="header">
          {t('home.greeting', { name: firstName })}
        </Text>
        {user?.tenantName ? (
          <Text variant="bodySmall" color="mutedForeground">
            {user.tenantName}
          </Text>
        ) : null}
        {summary.data ? <LastUpdated updatedAt={summary.dataUpdatedAt} /> : null}
      </View>

      {/* (1) + (2): Business Health and What Needs Attention — deterministic, AI-provider independent. */}
      {canViewAi ? (
        <>
          {summary.isLoading ? <LoadingState variant="cards" rows={2} /> : null}
          {summary.isError && !summary.data ? (
            getAiErrorCode(summary.error) === 'feature_not_entitled' ? (
              <NotEntitledCard />
            ) : (
              <ErrorState message={t('cc.loadError')} onRetry={() => summary.refetch()} />
            )
          ) : null}
          {summary.data ? (
            <>
              <HealthStrip health={summary.data.health} />
              <Card>
                <CardHeader
                  title={t('home.attention')}
                  action={
                    summary.data.attentionItems.length > 0 ? (
                      <Button label={t('common.viewAll')} variant="ghost" size="sm" onPress={() => router.push('/command-center/attention')} />
                    ) : undefined
                  }
                />
                <AttentionList items={summary.data.attentionItems.slice(0, 3)} compact />
              </Card>
            </>
          ) : null}
        </>
      ) : (
        <Card>
          <EmptyState icon="analytics-outline" title={t('home.noInsightsTitle')} description={t('home.noInsightsDescription')} />
        </Card>
      )}

      {/* (3) KPI tiles from the executive report (today, tenant timezone). */}
      {canViewReports ? (
        <View style={styles.section}>
          <Text variant="overline" color="mutedForeground">
            {t('home.keyFigures')}
          </Text>
          {keyFigures.isLoading ? <LoadingState variant="cards" rows={1} /> : null}
          {keyFigures.isError && !keyFigures.data ? (
            extractErrorCode(keyFigures.error) === 'feature_not_entitled' ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('home.keyFiguresNotEntitled')}
              </Text>
            ) : (
              <ErrorState message={t('home.keyFiguresError')} onRetry={() => keyFigures.refetch()} />
            )
          ) : null}
          {keyFigures.data ? (
            <View style={styles.tiles}>
              <StatCard icon="wallet-outline" label={t('home.cashPosition')} value={money(keyFigures.data.cashPosition)} hint={t('home.cashPositionHint')} />
              <StatCard icon="cash-outline" label={t('home.receivables')} value={money(keyFigures.data.receivables)} hint={t('home.receivablesHint')} />
              <StatCard icon="receipt-outline" label={t('home.salesToday')} value={money(keyFigures.data.sales)} hint={t('home.salesTodayHint')} />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* (4) Approvals pending — the inbox total; tapping jumps to the Approvals tab. */}
      <StatCard
        icon="checkmark-done-outline"
        label={t('home.approvalsPending')}
        value={approvals.count != null ? formatNumber(approvals.count) : '—'}
        hint={t('home.approvalsPendingHint')}
        onPress={() => router.push('/approvals')}
      />

      {/* (5) Command Center entry point. */}
      {canViewAi ? (
        <Card onPress={() => router.push('/command-center')} accessibilityLabel={t('home.commandCenterCard')}>
          <View style={styles.ccRow}>
            <View style={[styles.ccIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name="sparkles" size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text variant="subheading">{t('home.commandCenterCard')}</Text>
              <Text variant="bodySmall" color="mutedForeground">
                {t('home.commandCenterCardDescription')}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.mutedForeground} />
          </View>
          {aiConfigured && pendingProposals > 0 ? (
            <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
              {t('cc.recommendedActions')}: {formatNumber(pendingProposals)}
            </Text>
          ) : null}
        </Card>
      ) : null}
      {canViewAi && summary.data && !aiConfigured ? <AiUnavailableNotice title={`${t('cc.ask')} · ${t('cc.recommendedActions')}`} /> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  greeting: { gap: spacing.xs },
  section: { gap: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  ccRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ccIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
