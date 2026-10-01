import { useEffect, useRef, useState } from 'react'
import { Stack, router } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { queryClient } from '@/api/queryClient'
import { AuthProvider } from '@/auth/AuthProvider'
import { PortalAuthProvider } from '@/auth/PortalAuthProvider'
import { onSessionExpired } from '@/auth/sessionEvents'
import { ToastProvider, useToast } from '@/components/Toast'
import { I18nProvider, loadInitialLanguage, useI18n, type Language } from '@/i18n'
import { HOME_FOR_MODE, useAppMode } from '@/navigation/appMode'
import { ThemeProvider, useTheme } from '@/theme'

void SplashScreen.preventAutoHideAsync().catch(() => undefined)

/**
 * Root layout. Provider order: safe area → theme → i18n (language read from prefs before first
 * render) → TanStack Query → the two independent auth contexts → toasts → navigator.
 *
 * The splash screen stays up until BOTH SecureStore sessions have been read, so an already-signed-in
 * user never sees a login screen flash. The three route groups are guarded with `Stack.Protected`,
 * so `(internal)` screens are unreachable without a staff session and `(portal)` screens without a
 * portal session — structurally separate trees, never mixed.
 */
export default function RootLayout() {
  const [language, setLanguage] = useState<Language | null>(null)

  useEffect(() => {
    loadInitialLanguage().then(setLanguage)
  }, [])

  if (!language) return null

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider initialLanguage={language}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <PortalAuthProvider>
                <ToastProvider>
                  <RootNavigator />
                </ToastProvider>
              </PortalAuthProvider>
            </AuthProvider>
          </QueryClientProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function RootNavigator() {
  const mode = useAppMode()
  const { colors, scheme } = useTheme()
  const { t } = useI18n()
  const toast = useToast()
  const previousMode = useRef(mode)

  useEffect(() => {
    if (mode !== 'restoring') void SplashScreen.hideAsync().catch(() => undefined)
  }, [mode])

  // Sign-in, sign-out and session expiry all change `mode`; navigate to that mode's home exactly
  // once per change (the guards below already make the other groups unreachable).
  useEffect(() => {
    const previous = previousMode.current
    previousMode.current = mode
    if (mode === 'restoring' || previous === mode || previous === 'restoring') return
    router.replace(HOME_FOR_MODE[mode])
  }, [mode])

  // The axios interceptors can't import the router; they emit here when a refresh token is
  // rejected. The session is already cleared by then, so `mode` flips and the effect above routes
  // to the sign-in chooser — this just tells the user why.
  useEffect(
    () =>
      onSessionExpired(() => {
        toast({ title: t('auth.sessionExpired.title'), description: t('auth.sessionExpired.message'), variant: 'error' })
      }),
    [toast, t],
  )

  if (mode === 'restoring') return null

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={mode === 'auth'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={mode === 'internal'}>
          <Stack.Screen name="(internal)" />
        </Stack.Protected>
        <Stack.Protected guard={mode === 'portal'}>
          <Stack.Screen name="(portal)" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  )
}
