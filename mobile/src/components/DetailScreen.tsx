import { useState, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { extractStatus } from '@/api/apiClient'
import { useI18n } from '@/i18n'
import { LastUpdated } from './LastUpdated'
import { Screen } from './Screen'
import { ErrorState, LoadingState } from './StateViews'

/**
 * Scaffold for a record's detail screen: skeleton while the `GET /…/{id}` loads, a not-found /
 * error state with retry, then the content with pull-to-refresh (which also refetches whatever
 * extra queries the screen passes in `refetchAlso`, e.g. its embedded sections).
 */
export function DetailScreen<T>({
  query,
  children,
  errorMessage,
  refetchAlso = [],
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  errorMessage: string
  refetchAlso?: { refetch: () => Promise<unknown> }[]
}) {
  const { t } = useI18n()
  const [refreshing, setRefreshing] = useState(false)

  if (query.isLoading) {
    return (
      <Screen edges={[]}>
        <LoadingState variant="cards" rows={3} />
      </Screen>
    )
  }
  if (!query.data) {
    const notFound = extractStatus(query.error) === 404
    return (
      <Screen edges={[]}>
        <ErrorState message={notFound ? t('detail.notFound') : errorMessage} onRetry={notFound ? undefined : () => query.refetch()} />
      </Screen>
    )
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([query.refetch(), ...refetchAlso.map((q) => q.refetch())])
    setRefreshing(false)
  }

  return (
    <Screen edges={[]} onRefresh={onRefresh} refreshing={refreshing}>
      <LastUpdated updatedAt={query.dataUpdatedAt} />
      {children(query.data)}
    </Screen>
  )
}
