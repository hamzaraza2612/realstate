import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Alert, I18nManager, Platform } from 'react-native'
import { reloadAppAsync } from 'expo'
import { readPreference, writePreference } from '@/storage/preferences'
import { en } from './en'
import { ar } from './ar'

/**
 * Minimal, dependency-free i18n — a port of the web app's `frontend/src/lib/i18n/index.tsx`
 * (same `t()` fallback chain: active language → English → raw key; never blank, never throws),
 * plus React Native's real RTL layout mirroring.
 *
 * RTL on React Native is applied by `I18nManager.forceRTL()`, which only takes effect after the JS
 * bundle restarts (the native layout direction is fixed per app run). So switching between English
 * and Arabic updates the text immediately, records the new direction natively, and asks the user to
 * restart now (`reloadAppAsync`) — it does not pretend the mirroring is instant. One screen
 * implementation per route; no duplicated Arabic screens.
 */

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

const RESOURCES: Record<Language, Record<string, string>> = { en, ar }

export function directionFor(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr'
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string

interface I18nContextValue {
  language: Language
  /** The direction the CURRENT app run is laid out in (may lag `language` until a restart). */
  layoutDirection: Direction
  /** True when the chosen language's direction differs from the running layout direction. */
  restartPending: boolean
  t: TFunction
  setLanguage: (language: Language) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function currentLayoutDirection(): Direction {
  return I18nManager.isRTL ? 'rtl' : 'ltr'
}

/** Records the desired direction natively; returns true when a restart is needed to apply it. */
function applyDirection(language: Language): boolean {
  const wantRtl = directionFor(language) === 'rtl'
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = directionFor(language)
      document.documentElement.lang = language
    }
    return false
  }
  I18nManager.allowRTL(wantRtl)
  I18nManager.forceRTL(wantRtl)
  return I18nManager.isRTL !== wantRtl
}

export async function loadInitialLanguage(): Promise<Language> {
  const stored = await readPreference('language')
  return stored === 'ar' ? 'ar' : 'en'
}

export function I18nProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const [restartPending, setRestartPending] = useState(false)

  useEffect(() => {
    // Sync the native direction with the stored choice at launch (e.g. first launch on a device
    // whose OS locale is RTL while the app language is English).
    setRestartPending(applyDirection(initialLanguage))
  }, [initialLanguage])

  const t = useMemo<TFunction>(() => {
    const table = RESOURCES[language]
    return (key, params) => {
      let value = table[key] ?? en[key] ?? key
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          value = value.split(`{${name}}`).join(String(replacement))
        }
      }
      return value
    }
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    void writePreference('language', next)
    const needsRestart = applyDirection(next)
    setRestartPending(needsRestart)
    if (!needsRestart) return
    // Prompt in the NEW language, since that's what the user just picked.
    const table = RESOURCES[next]
    Alert.alert(table['language.restartTitle'], table['language.restartMessage'], [
      { text: table['language.later'], style: 'cancel' },
      { text: table['language.restartNow'], onPress: () => void reloadAppAsync('Layout direction changed') },
    ])
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({ language, layoutDirection: currentLayoutDirection(), restartPending, t, setLanguage }),
    [language, restartPending, t, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
