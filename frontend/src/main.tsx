import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { queryClient } from './app/queryClient'
import { Toaster } from './components/ui/toaster'
import { I18nProvider, normalizeLanguage } from './lib/i18n'
import { useLocalizationStore } from './stores/localizationStore'
import './index.css'

/** Bridges the tenant localization store's `defaultLanguage` into the I18nProvider as its initial
 * language — applied only until/unless the viewer picks a language of their own (see
 * I18nProvider's `initialLanguage` doc). Kept as a tiny wrapper component (rather than passed
 * directly in the JSX below) so it re-renders, and therefore re-derives `initialLanguage`, once
 * the localization store finishes loading after login. */
function LocalizedApp() {
  const defaultLanguage = useLocalizationStore((s) => s.data?.defaultLanguage)
  return (
    <I18nProvider initialLanguage={defaultLanguage ? normalizeLanguage(defaultLanguage) : undefined}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocalizedApp />
    </QueryClientProvider>
  </StrictMode>,
)
