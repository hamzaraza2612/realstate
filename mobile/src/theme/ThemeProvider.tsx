import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { readPreference, writePreference } from '@/storage/preferences'
import { darkColors, lightColors, type ColorPalette } from './colors'

/**
 * Light/dark theme — the mobile port of the web `themeStore` (a persisted light/dark toggle), plus
 * a "system" option that follows the OS appearance, which is the expected default on a phone.
 * The preference is a non-sensitive UI setting, so it lives in AsyncStorage.
 */

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  colors: ColorPalette
  scheme: 'light' | 'dark'
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  useEffect(() => {
    readPreference('theme').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored)
    })
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference
    return {
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      preference,
      setPreference: (next) => {
        setPreferenceState(next)
        void writePreference('theme', next)
      },
    }
  }, [preference, system])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
