import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { formatDateTime } from '@/utils/format'
import { Text } from './Text'

/** "Last updated …" marker, shown only while offline so cached data is never mistaken for fresh. */
export function LastUpdated({ updatedAt }: { updatedAt: number }) {
  const { isOffline } = useNetworkStatus()
  const { t } = useI18n()
  if (!isOffline || !updatedAt) return null
  return (
    <Text variant="caption" color="warning">
      {t('common.lastUpdated', { time: formatDateTime(new Date(updatedAt).toISOString()) })}
    </Text>
  )
}
