import { useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { Button, EmptyState, ErrorState, Icon, LastUpdated, LoadingState, PageHeader, SegmentedControl, Text, useToast } from '@/components'
import { Screen } from '@/components/Screen'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { radius, spacing, useTheme } from '@/theme'
import type { NotificationDto } from '@/types/api'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationsInfinite, useUnreadNotificationCount } from './api'

/** Notifications tab: list (All/Unread), unread count, tap-to-mark-read, mark-all-read,
 * pull-to-refresh, paged "Load more". Writes are disabled while offline. */
export function NotificationsScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const toast = useToast()
  const { isOffline } = useNetworkStatus()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const list = useNotificationsInfinite(filter === 'unread')
  const unread = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const [refreshing, setRefreshing] = useState(false)

  const items = list.data?.pages.flatMap((page) => page.items) ?? []
  const unreadCount = unread.data ?? 0

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([list.refetch(), unread.refetch()])
    setRefreshing(false)
  }

  async function handleMarkRead(notification: NotificationDto) {
    if (notification.isRead || isOffline) return
    try {
      await markRead.mutateAsync(notification.id)
    } catch {
      toast({ title: t('notifications.actionError'), variant: 'error' })
    }
  }

  async function handleMarkAll() {
    try {
      await markAll.mutateAsync()
    } catch {
      toast({ title: t('notifications.actionError'), variant: 'error' })
    }
  }

  const header = (
    <View style={styles.header}>
      <PageHeader
        title={t('notifications.title')}
        description={unreadCount > 0 ? t('notifications.unreadCount', { count: formatNumber(unreadCount) }) : t('notifications.allRead')}
        action={
          unreadCount > 0 ? (
            <Button
              label={t('notifications.markAllRead')}
              variant="outline"
              size="sm"
              icon="checkmark-done"
              onPress={handleMarkAll}
              loading={markAll.isPending}
              disabled={isOffline}
            />
          ) : undefined
        }
      />
      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('notifications.filterAll') },
          { value: 'unread', label: t('notifications.filterUnread') },
        ]}
      />
      {list.data ? <LastUpdated updatedAt={list.dataUpdatedAt} /> : null}
    </View>
  )

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          list.isLoading ? (
            <LoadingState rows={5} />
          ) : list.isError ? (
            <ErrorState message={t('notifications.loadError')} onRetry={() => list.refetch()} />
          ) : (
            <EmptyState icon="notifications-off-outline" title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityHint={!item.isRead ? t('notifications.markRead') : undefined}
            accessibilityLabel={`${item.isRead ? '' : `${t('status.unread')}. `}${item.title}. ${item.body}`}
            onPress={() => handleMarkRead(item)}
            style={({ pressed }) => [
              styles.item,
              { borderColor: colors.border, backgroundColor: item.isRead ? colors.card : colors.primarySoft },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.dotCol}>{!item.isRead ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}</View>
            <View style={styles.flex}>
              <Text variant="subheading" style={!item.isRead ? styles.unreadTitle : undefined}>
                {item.title}
              </Text>
              <Text variant="bodySmall" color="mutedForeground">
                {item.body}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
            {!item.isRead && !isOffline ? <Icon name="checkmark-circle-outline" size={20} color={colors.mutedForeground} /> : null}
          </Pressable>
        )}
        ListFooterComponent={
          list.hasNextPage ? (
            <Button
              label={t('notifications.loadMore')}
              variant="ghost"
              onPress={() => list.fetchNextPage()}
              loading={list.isFetchingNextPage}
            />
          ) : null
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  item: { flexDirection: 'row', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  dotCol: { width: 10, paddingTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  unreadTitle: { fontWeight: '700' },
})
