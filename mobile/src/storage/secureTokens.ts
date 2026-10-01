import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * The ONLY place this app persists credentials. Backed by `expo-secure-store` (iOS Keychain /
 * Android Keystore) — never AsyncStorage, never plaintext files.
 *
 * Internal (ERP staff) and portal (external customer/tenant/owner/vendor/member) sessions use
 * distinct key prefixes, mirroring the web app's separate `erp-auth` / `erp-portal-auth` stores,
 * so the two token families can never collide and can both exist on one device.
 *
 * The cached profile (the `user`/`profile` object from the last login/refresh) is stored alongside
 * the tokens so a cold start can render the right app instantly, even offline. A staff profile's
 * `permissions` array can exceed SecureStore's ~2 KB per-value guidance, so values are chunked.
 *
 * Web preview (react-native-web) has no secure enclave and `expo-secure-store` has no web
 * implementation: there we fall back to an IN-MEMORY map, so a browser reload signs you out.
 * That's deliberate — tokens are never written to localStorage/AsyncStorage on any platform.
 */

export type SessionKind = 'internal' | 'portal'

export interface StoredSession<TProfile> {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  profile: TProfile
}

const PREFIX: Record<SessionKind, string> = {
  internal: 'erp.internal',
  portal: 'erp.portal',
}

const CHUNK_SIZE = 1800

const memory = new Map<string, string>()
const useMemory = Platform.OS === 'web'

async function getItem(key: string): Promise<string | null> {
  if (useMemory) return memory.get(key) ?? null
  return SecureStore.getItemAsync(key)
}

async function setItem(key: string, value: string): Promise<void> {
  if (useMemory) {
    memory.set(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK })
}

async function deleteItem(key: string): Promise<void> {
  if (useMemory) {
    memory.delete(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

async function writeChunked(baseKey: string, value: string) {
  const previousCount = Number((await getItem(`${baseKey}.count`)) ?? '0')
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) chunks.push(value.slice(i, i + CHUNK_SIZE))
  for (let i = 0; i < chunks.length; i++) await setItem(`${baseKey}.${i}`, chunks[i])
  for (let i = chunks.length; i < previousCount; i++) await deleteItem(`${baseKey}.${i}`)
  await setItem(`${baseKey}.count`, String(chunks.length))
}

async function readChunked(baseKey: string): Promise<string | null> {
  const count = Number((await getItem(`${baseKey}.count`)) ?? '0')
  if (!count) return null
  let value = ''
  for (let i = 0; i < count; i++) {
    const chunk = await getItem(`${baseKey}.${i}`)
    if (chunk == null) return null
    value += chunk
  }
  return value
}

async function deleteChunked(baseKey: string) {
  const count = Number((await getItem(`${baseKey}.count`)) ?? '0')
  for (let i = 0; i < count; i++) await deleteItem(`${baseKey}.${i}`)
  await deleteItem(`${baseKey}.count`)
}

export async function saveSession<TProfile>(kind: SessionKind, session: StoredSession<TProfile>): Promise<void> {
  const p = PREFIX[kind]
  await setItem(`${p}.accessToken`, session.accessToken)
  await setItem(`${p}.refreshToken`, session.refreshToken)
  await setItem(`${p}.accessTokenExpiresAt`, session.accessTokenExpiresAt)
  await writeChunked(`${p}.profile`, JSON.stringify(session.profile))
}

export async function loadSession<TProfile>(kind: SessionKind): Promise<StoredSession<TProfile> | null> {
  const p = PREFIX[kind]
  try {
    const [accessToken, refreshToken, accessTokenExpiresAt, profileJson] = await Promise.all([
      getItem(`${p}.accessToken`),
      getItem(`${p}.refreshToken`),
      getItem(`${p}.accessTokenExpiresAt`),
      readChunked(`${p}.profile`),
    ])
    if (!accessToken || !refreshToken || !profileJson) return null
    return { accessToken, refreshToken, accessTokenExpiresAt: accessTokenExpiresAt ?? '', profile: JSON.parse(profileJson) as TProfile }
  } catch {
    // Corrupt/unreadable keychain entry (e.g. restored from a backup onto a new device) — treat as
    // signed out rather than crashing the launch.
    return null
  }
}

export async function clearSession(kind: SessionKind): Promise<void> {
  const p = PREFIX[kind]
  await Promise.all([deleteItem(`${p}.accessToken`), deleteItem(`${p}.refreshToken`), deleteItem(`${p}.accessTokenExpiresAt`)])
  await deleteChunked(`${p}.profile`)
}
