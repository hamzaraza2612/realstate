import { AppState, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query'
import { extractStatus } from './createApiClient'

/**
 * The one TanStack Query client for the app (same library and conventions as the web app).
 *
 * - `onlineManager` follows NetInfo, so while offline queries pause instead of erroring and the
 *   cache keeps serving the last-known data (screens label it with "Last updated …").
 * - `focusManager` follows AppState, so returning to the app refetches stale data like a browser
 *   tab regaining focus does on web.
 * - Mutations are never queued for later: screens disable every write while offline (see
 *   `useNetworkStatus`) — there is no offline write sync, by design (docs/MOBILE_ARCHITECTURE.md).
 */

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false)
  }),
)

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active')
  })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = extractStatus(error)
        // Don't hammer the API on deterministic failures (auth/permission/entitlement/not found).
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      networkMode: 'always',
      retry: false,
    },
  },
})
