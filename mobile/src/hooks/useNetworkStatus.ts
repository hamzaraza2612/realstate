import { useNetInfo } from '@react-native-community/netinfo'

/**
 * Connectivity for the UI. `isOffline` is only true when NetInfo positively reports no connection
 * (an unknown state at startup counts as online, so the app never flashes an offline banner).
 * Every mutation button checks `isOffline` and is disabled with an explicit "You're offline" hint —
 * writes are never queued or optimistically faked while offline.
 */
export function useNetworkStatus() {
  const netInfo = useNetInfo()
  return { isOffline: netInfo.isConnected === false }
}
