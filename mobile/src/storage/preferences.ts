import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Non-sensitive, per-device UI preferences ONLY (language, theme). AsyncStorage is unencrypted —
 * tokens and profiles live in `secureTokens.ts` (SecureStore), never here.
 */

const KEYS = {
  language: 'pref.language',
  theme: 'pref.theme',
} as const

export type PreferenceKey = keyof typeof KEYS

export async function readPreference(key: PreferenceKey): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS[key])
  } catch {
    return null
  }
}

export async function writePreference(key: PreferenceKey, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS[key], value)
  } catch {
    // The preference still applies for this session; it just won't be remembered.
  }
}
