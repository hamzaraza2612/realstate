import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'

/**
 * PUSH NOTIFICATIONS — ARCHITECTURALLY PREPARED, NOT DELIVERED.
 *
 * This is the device-side half of the seam described in docs/MOBILE_ARCHITECTURE.md: it asks for
 * permission and obtains an Expo push token. It is deliberately NOT called anywhere in the UI yet,
 * and the app shows no "push enabled" indicator, because:
 *
 *  1. The backend has NO device-registration endpoint today (no `/notifications/devices` or similar
 *     exists in `backend/src/Api/Controllers`) — there is nowhere to send the token. Adding one is a
 *     backend change outside this milestone's "no new endpoint" rule; it's reported as a gap.
 *  2. Actual delivery needs APNs/FCM credentials and an EAS `projectId`, which this environment
 *     doesn't have.
 *
 * When the endpoint exists, `registerForPushAsync()` is where the token gets POSTed (with the
 * internal or portal client matching the signed-in session).
 */

export type PushRegistrationResult =
  | { status: 'unsupported'; reason: 'simulator' | 'web' }
  | { status: 'denied' }
  | { status: 'no-project-id' }
  | { status: 'token'; token: string }

export async function getExpoPushTokenAsync(): Promise<PushRegistrationResult> {
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

/** Placeholder for the server half of the seam — intentionally does not send the token anywhere
 * until a backend device-registration endpoint exists (see the module docstring). */
export async function registerForPushAsync(): Promise<PushRegistrationResult> {
  return getExpoPushTokenAsync()
}
