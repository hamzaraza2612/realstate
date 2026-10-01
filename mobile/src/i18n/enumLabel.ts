import { useCallback } from 'react'
import { normalizeStatus } from '@/components/StatusBadge'
import { useI18n } from './index'

/**
 * Display label for a backend enum value (lead source, priority, unit type, expense category, …).
 * Same rule as `StatusBadge`: the English label comes from the `…Label` record in `types/modules.ts`;
 * in Arabic it is looked up as `enum.<normalized English label>` and falls back to the English
 * label when a translation is missing — never blank.
 */
export function useEnumLabel() {
  const { t, language } = useI18n()
  return useCallback(
    <K extends string | number>(labels: Record<K, string>, value: K | null | undefined): string => {
      if (value == null) return '—'
      const label = labels[value] ?? String(value)
      if (language === 'en') return label
      const key = `enum.${normalizeStatus(label)}`
      const translated = t(key)
      return translated === key ? label : translated
    },
    [t, language],
  )
}

/** A status name as `StatusBadge` would display it (`status.<normalized>` in Arabic), for places
 * that need the text without the pill — e.g. the options of a status filter. */
export function useStatusLabel() {
  const { t, language } = useI18n()
  return useCallback(
    <K extends string | number>(labels: Record<K, string>, value: K): string => {
      const label = labels[value] ?? String(value)
      if (language === 'en') return label
      const key = `status.${normalizeStatus(label)}`
      const translated = t(key)
      return translated === key ? label : translated
    },
    [t, language],
  )
}
