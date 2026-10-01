import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { apiClient } from '@/api/apiClient'
import { portalApiClient } from '@/api/portalApiClient'

/**
 * PUSH NOTIFICATIONS — DEVICE REGISTRATION IS REAL, DELIVERY IS NOT.
 *
 * This is the device-side half of the Milestone 18 seam described in docs/MOBILE_ARCHITECTURE.md:
 * it asks for OS permission, obtains an Expo push token, and POSTs it to the backend's
 * device-registration endpoint (`POST /notifications/device-tokens` for staff,
 * `POST /portal/device-tokens` for portal users) so the token is durably stored per
 * (tenant, owner, platform). That registration is genuinely persisted and upserted — verified by
 * backend integration tests in `DeviceRegistrationTests.cs`.
 *
 * What this does NOT do: send a push. There is no APNs/FCM credential or notification-dispatch job
 * wired to these tokens anywhere in this codebase. A registered token sits in the database, used by
 * nothing, until a future milestone adds an actual push provider integration. Never present
 * registration success as "push notifications enabled" — the UI calling this must say "registered
 * for this device" (true today) rather than "notifications enabled" (not true).
 */

export type PushRegistrationResult =
  | { status: 'unsupported'; reason: 'simulator' | 'web' }
  | { status: 'denied' }
  | { status: 'no-project-id' }
  | { status: 'registered'; token: string }
  | { status: 'register-failed' }

async function getExpoPushTokenAsync(): Promise<PushRegistrationResult | { status: 'token'; token: string }> {
  if (Platform.OS === 'web') return { status: 'unsupported', reason: 'web' }
  if (!Device.isDevice) return { status: 'unsupported', reason: 'simulator' }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  let granted = existing.granted
  if (!granted) {
    granted = (await Notifications.requestPermissionsAsync()).granted
  }
  if (!granted) return { status: 'denied' }

  const projectId: string | undefined =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) return { status: 'no-project-id' }

  const token = await Notifications.getExpoPushTokenAsync({ projectId })
  return { status: 'token', token: token.data }
}

function devicePlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

/** Obtains an Expo push token and registers it against the signed-in staff user's own device-tokens
 * endpoint. Call this only from an explicit user action (a settings toggle), never silently on
 * app start — requesting OS notification permission unprompted is poor practice on both platforms. */
export async function registerInternalDeviceForPushAsync(): Promise<PushRegistrationResult> {
  const result = await getExpoPushTokenAsync()
  if (result.status !== 'token') return result

  try {
    await apiClient.post('/notifications/device-tokens', { platform: devicePlatform(), pushToken: result.token })
    return { status: 'registered', token: result.token }
  } catch {
    return { status: 'register-failed' }
  }
}

/** Portal equivalent of registerInternalDeviceForPushAsync — registers against the signed-in portal
 * user's own device-tokens endpoint. Must only ever be called from portal screens with
 * portalApiClient's own token source; never mix with the internal client. */
export async function registerPortalDeviceForPushAsync(): Promise<PushRegistrationResult> {
  const result = await getExpoPushTokenAsync()
  if (result.status !== 'token') return result

  try {
    await portalApiClient.post('/portal/device-tokens', { platform: devicePlatform(), pushToken: result.token })
    return { status: 'registered', token: result.token }
  } catch {
    return { status: 'register-failed' }
  }
}
