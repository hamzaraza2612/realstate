import { ErrorState, LoadingState } from '@/components'
import { Screen } from '@/components/Screen'
import { useCommandCenterSummary } from '@/features/commandCenter/api'
import { AttentionList } from '@/features/commandCenter/AttentionList'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/i18n'

/** "View all" from Home — every What Needs Attention item, from the same (cached) summary. */
export default function AttentionRoute() {
  const { t } = useI18n()
  const canView = usePermission('ai.view')
  const { data, isLoading, isError, refetch, isRefetching } = useCommandCenterSummary(canView)
  return (
    <Screen edges={[]} onRefresh={() => refetch()} refreshing={isRefetching}>
      {isLoading ? <LoadingState variant="cards" rows={3} /> : null}
      {isError && !data ? <ErrorState message={t('cc.loadError')} onRetry={() => refetch()} /> : null}
      {data ? <AttentionList items={data.attentionItems} /> : null}
    </Screen>
  )
}
