import { useState, type ReactElement, type ReactNode } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { flattenPages, pagedTotal, type PagedListQuery } from '@/api/paging'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { formatNumber } from '@/utils/format'
import { Button } from './Button'
import { Card, CardHeader } from './Card'
import type { IconName } from './Icon'
import { LastUpdated } from './LastUpdated'
import { EmptyState, ErrorState, LoadingState } from './StateViews'
import { Text } from './Text'

/**
 * A full-screen, server-paginated list — the shared shape of the Notifications screen (header,
 * pull-to-refresh, skeleton / error / empty states, page-by-page "Load more"), so every module list
 * behaves the same. Pages come from `usePagedList` (20 per page); nothing is loaded unbounded.
 */
export function PagedList<T>({
  query,
  header,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  errorMessage,
}: {
  query: PagedListQuery<T>
  header?: ReactNode
  renderItem: (item: T) => ReactElement
  keyExtractor: (item: T) => string
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: IconName
  errorMessage: string
}) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const items = flattenPages(query.data)
  const total = pagedTotal(query.data)

  async function onRefresh() {
    setRefreshing(true)
    await query.refetch()
    setRefreshing(false)
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {query.data ? <LastUpdated updatedAt={query.dataUpdatedAt} /> : null}
          {total != null && items.length > 0 ? (
            <Text variant="caption" color="mutedForeground">
              {t('list.showingOf', { shown: formatNumber(items.length), total: formatNumber(total) })}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <LoadingState rows={5} />
        ) : query.isError ? (
          <ErrorState message={errorMessage} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        )
      }
      renderItem={({ item }) => renderItem(item)}
      ListFooterComponent={
        query.hasNextPage ? (
          <Button label={t('list.loadMore')} variant="ghost" onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} />
        ) : null
      }
    />
  )
}

/**
 * The same paged list embedded inside a scrolling detail screen (a lead's activities, a property's
 * units, …): a card whose rows are rendered inline (a FlatList can't nest inside the detail's
 * ScrollView), still fetched 20 at a time with "Load more".
 */
export function PagedSection<T>({
  title,
  query,
  renderItem,
  keyExtractor,
  emptyText,
  errorMessage,
  action,
}: {
  title: string
  query: PagedListQuery<T>
  renderItem: (item: T) => ReactElement
  keyExtractor: (item: T) => string
  emptyText: string
  errorMessage: string
  action?: ReactNode
}) {
  const { t } = useI18n()
  const { colors } = useTheme()
  const items = flattenPages(query.data)
  const total = pagedTotal(query.data)

  return (
    <Card>
      <CardHeader title={title} subtitle={total != null && total > 0 ? t('list.totalCount', { total: formatNumber(total) }) : undefined} action={action} />
      {query.isLoading ? (
        <LoadingState rows={2} />
      ) : query.isError ? (
        <ErrorState message={errorMessage} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <Text variant="bodySmall" color="mutedForeground">
          {emptyText}
        </Text>
      ) : (
        <View>
          {items.map((item, index) => (
            <View key={keyExtractor(item)} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      )}
      {query.hasNextPage ? (
        <Button label={t('list.loadMore')} variant="ghost" size="sm" onPress={() => query.fetchNextPage()} loading={query.isFetchingNextPage} />
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  header: { gap: spacing.md, marginBottom: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
})
