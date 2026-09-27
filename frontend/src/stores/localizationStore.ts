import { create } from 'zustand'
import { apiClient } from '@/lib/apiClient'
import type { ApiEnvelope, TenantLocalizationDto } from '@/types/api'

/** The current tenant's resolved localization profile (currency/locale/timezone/date format/
 * first-day-of-week/default language) — fetched once per session from `GET /localization/current`
 * (see docs on `LocalizationSettingsPage`) and read from everywhere formatting needs to be
 * currency/locale-aware (lib/utils.ts's formatCurrency/formatDate/formatNumber/formatPercentage,
 * modules/reports/format.ts's money()). Deliberately NOT persisted to localStorage — this is
 * server-authoritative tenant configuration, not a per-viewer preference (contrast the i18n
 * language switcher, which IS a per-viewer preference and does use localStorage). */

type LocalizationStatus = 'idle' | 'loading' | 'loaded' | 'error'

interface LocalizationState {
  data: TenantLocalizationDto | null
  status: LocalizationStatus
  /** Fetches the current tenant's localization profile, unless it is already loaded or in
   * flight. Safe to call from multiple mount points (e.g. AppShell) without duplicating requests. */
  fetch: () => Promise<void>
  setData: (data: TenantLocalizationDto) => void
  reset: () => void
}

export const useLocalizationStore = create<LocalizationState>((set, get) => ({
  data: null,
  status: 'idle',
  fetch: async () => {
    const status = get().status
    if (status === 'loading' || status === 'loaded') return
    set({ status: 'loading' })
    try {
      const response = await apiClient.get<ApiEnvelope<TenantLocalizationDto>>('/localization/current')
      set({ data: response.data.data, status: 'loaded' })
    } catch {
      // A 403 (missing organizations.view) or network failure both just mean "no localization
      // profile available yet" — every formatter already falls back to the browser default, so
      // this is never fatal to the page that triggered the fetch.
      set({ status: 'error' })
    }
  },
  setData: (data) => set({ data, status: 'loaded' }),
  reset: () => set({ data: null, status: 'idle' }),
}))
