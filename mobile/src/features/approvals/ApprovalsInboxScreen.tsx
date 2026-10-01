import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Card, EmptyState, ErrorState, LastUpdated, LoadingState, PageHeader, StatusBadge, Text } from '@/components'
import { Icon } from '@/components/Icon'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { ApprovalStatusLabel, type ApprovalRequestDto } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { APPROVALS_KEY, useApprovalInbox } from './api'

/** Approvals tab — the caller's pending inbox (`GET /approvals/inbox`, object-scoped server-side).
 * The same inbox AI action proposals land in. Tap a row to review and decide. */
export function ApprovalsInboxScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const inbox = useApprovalInbox(1)
  const [refreshing, setRefreshing] = useState(false)
  const items = inbox.data?.items ?? []

  async function onRefresh() {
    setRefreshing(true)
    await inbox.refetch()
    setRefreshing(false)
  }

  function open(item: ApprovalRequestDto) {
    // Seed the detail screen with the row we already have (GET /approvals/{id} needs approvals.view,
    // which a named approver may not hold).
    queryClient.setQueryData([...APPROVALS_KEY, 'detail', item.id], item)
    router.push({ pathname: '/approval/[id]', params: { id: item.id } })
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeader title={t('approvals.title')} description={t('approvals.description')} />
            {inbox.data ? <LastUpdated updatedAt={inbox.dataUpdatedAt} /> : null}
          </View>
        }
        ListEmptyComponent={
          inbox.isLoading ? (
            <LoadingState rows={4} />
          ) : inbox.isError ? (
            <ErrorState message={t('approvals.loadError')} onRetry={() => inbox.refetch()} />
          ) : (
            <EmptyState icon="checkmark-done-circle-outline" title={t('approvals.emptyTitle')} description={t('approvals.emptyDescription')} />
          )
        }
        renderItem={({ item }) => (
          <Card onPress={() => open(item)} accessibilityLabel={`${item.entityType}, ${item.requestedByUserName ?? ''}`}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="subheading">{item.entityType}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {t('approvals.requestedBy')}: {item.requestedByUserName ?? t('approvals.unknownUser')}
                </Text>
                <Text variant="caption" color="mutedForeground">
                  {formatDateTime(item.createdAt)}
                </Text>
                {item.requestComments ? (
                  <Text variant="bodySmall" numberOfLines={2}>
                    “{item.requestComments}”
                  </Text>
                ) : null}
              </View>
              <View style={styles.trailing}>
                <StatusBadge status={item.status} labels={ApprovalStatusLabel} />
                <Icon name="chevron-forward" size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </Card>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  header: { gap: spacing.sm, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trailing: { alignItems: 'flex-end', gap: spacing.sm },
})
