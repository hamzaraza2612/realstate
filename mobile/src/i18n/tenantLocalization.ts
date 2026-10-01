import { useSyncExternalStore } from 'react'
import type { AxiosInstance } from 'axios'
import type { ApiEnvelope, TenantLocalizationDto } from '@/types/api'

/**
 * The current tenant's `TenantLocalizationDto` (currency/locale/timezone/...) — the mobile port of
 * the web `stores/localizationStore.ts`. Server-authoritative tenant configuration, so it is held in
 * memory per session and never persisted.
 *
 * Bootstrapped right after sign-in / session restore, from the endpoint matching the session type:
 *   internal → `GET /localization/current` (needs `organizations.view`; a 403 just means "use the
 *              device default", exactly as on web)
 *   portal   → `GET /portal/localization` (added in M17 so portal sessions aren't stuck on USD)
 *
 * A module-level store (not React state) so `utils/format.ts`'s `money()` can read it synchronously
 * from anywhere, like the web `money()` reads `useLocalizationStore.getState()`.
 */

type Status = 'idle' | 'loading' | 'loaded' | 'error'

let state: { data: TenantLocalizationDto | null; status: Status } = { data: null, status: 'idle' }
const listeners = new Set<() => void>()

function set(next: typeof state) {
  state = next
  listeners.forEach((listener) => listener())
}

export function getTenantLocalization(): TenantLocalizationDto | null {
  return state.data
}

export async function fetchTenantLocalization(client: AxiosInstance, path: '/localization/current' | '/portal/localization') {
  if (state.status === 'loading' || state.status === 'loaded') return
  set({ ...state, status: 'loading' })
  try {
    const response = await client.get<ApiEnvelope<TenantLocalizationDto>>(path)
    set({ data: response.data.data, status: 'loaded' })
  } catch {
    // Every formatter falls back to the device default — never fatal.
    set({ data: null, status: 'error' })
  }
}

export function resetTenantLocalization() {
  set({ data: null, status: 'idle' })
}

/** Re-renders the caller when the tenant profile arrives, so amounts already on screen switch
 * from the fallback currency to the tenant's real one. */
export function useTenantLocalization() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
}
