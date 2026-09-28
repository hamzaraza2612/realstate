import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { en } from './en'
import { ar } from './ar'

/**
 * Minimal, dependency-free i18n system (Milestone 15). Deliberately hand-rolled instead of
 * pulling in i18next/react-intl/etc. — the scope this milestone needs is small: a language
 * switcher with live RTL support, proven working end-to-end on the Sidebar and the new
 * Localization Settings page. Translating the rest of the ~100-page app is out of scope here
 * (tracked for M17, the dedicated UI/i18n-completion milestone) — `t()` always falls back to
 * English (then to the raw key) for anything not yet covered, so an untranslated string never
 * renders blank or throws.
 */

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

const RESOURCES: Record<Language, Record<string, string>> = { en, ar }
const RTL_LANGUAGES: ReadonlySet<Language> = new Set<Language>(['ar'])
const STORAGE_KEY = 'erp-language'

export function directionFor(language: Language): Direction {
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'
}

/** Normalizes a loosely-typed language code (e.g. the tenant's `defaultLanguage`, which is a
 * free-form string server-side) down to one of the two languages this milestone ships. Anything
 * else — an unsupported code, null, undefined — falls back to English. */
export function normalizeLanguage(value: string | null | undefined): Language {
  const lower = value?.trim().toLowerCase()
  return lower === 'ar' ? 'ar' : 'en'
}

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'en' || stored === 'ar' ? stored : null
  } catch {
    // Private browsing / disabled storage — the viewer just won't get a remembered preference.
    return null
  }
}

function writeStoredLanguage(language: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Ignore — the language still applies for the rest of this session.
  }
}

interface I18nContextValue {
  language: Language
  dir: Direction
  /** Looks up `key` in the active language, falling back to English, then to the raw key itself.
   * Never throws and never renders blank. */
  t: (key: string) => string
  setLanguage: (language: Language) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  /** The tenant's resolved default language (from the localization store), applied only when the
   * viewer has never explicitly chosen a language themselves. Passing a new value later (once the
   * tenant profile finishes loading) still applies, as long as no explicit choice has been made
   * meanwhile. */
  initialLanguage?: Language
}) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage() ?? initialLanguage ?? 'en')

  useEffect(() => {
    if (initialLanguage && !readStoredLanguage()) {
      setLanguageState(initialLanguage)
    }
  }, [initialLanguage])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = directionFor(language)
  }, [language])

  function setLanguage(next: Language) {
    setLanguageState(next)
    writeStoredLanguage(next)
  }

  const t = useMemo(() => {
    const table = RESOURCES[language]
    return (key: string) => table[key] ?? en[key] ?? key
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({ language, dir: directionFor(language), t, setLanguage }), [language, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
