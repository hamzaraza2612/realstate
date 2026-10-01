import { useMemo } from 'react'
import { useI18n } from '@/i18n'
import { useStatusLabel } from '@/i18n/enumLabel'
import { Select } from './Select'

/**
 * "All statuses / <status>" picker for list screens whose endpoint has a `status` filter param
 * (numeric enum on the wire). `value` is the enum number, or undefined for "all".
 */
export function StatusFilter<K extends number>({
  labels,
  value,
  onChange,
}: {
  labels: Record<K, string>
  value: K | undefined
  onChange: (value: K | undefined) => void
}) {
  const { t } = useI18n()
  const statusLabel = useStatusLabel()
  const options = useMemo(
    () => [
      { value: 'all', label: t('list.allStatuses') },
      ...(Object.keys(labels) as unknown as string[]).map((key) => ({ value: key, label: statusLabel(labels, Number(key) as K) })),
    ],
    [labels, statusLabel, t],
  )
  return (
    <Select
      label={t('list.status')}
      value={value === undefined ? 'all' : String(value)}
      options={options}
      onChange={(next) => onChange(next === 'all' ? undefined : (Number(next) as K))}
    />
  )
}
