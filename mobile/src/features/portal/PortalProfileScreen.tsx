import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Constants from 'expo-constants'
import { usePortalAuth } from '@/auth/PortalAuthProvider'
import { Button, Card, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { registerPortalDeviceForPushAsync } from '@/features/notifications/pushRegistration'
import { PreferencesCard } from '@/features/profile/PreferencesCard'
import { SignOutButton } from '@/features/profile/SignOutButton'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { PortalIdentityCard } from './components/PortalIdentityCard'

/**
 * Portal "Account" screen — the portal user's identity (from the portal session), the per-device
 * preferences (language/RTL, theme), registering this device for future push, and sign-out (which
 * clears only the portal SecureStore session). Reached from the account button on every area's Home.
 */
export function PortalProfileScreen() {
  const { t } = useI18n()
  const { profile, logout } = usePortalAuth()
  if (!profile) return null

  return (
    <Screen edges={[]}>
      <PortalIdentityCard profile={profile} />
      <PreferencesCard />
      <PortalPushRegistrationCard />
      <SignOutButton onSignOut={logout} />
      <Text variant="caption" color="mutedForeground" style={styles.version}>
        {t('profile.version', { version: Constants.expoConfig?.version ?? '—' })}
      </Text>
    </Screen>
  )
}

/** The portal twin of the internal `PushRegistrationCard`: the same honest "register this device"
 * action (never "notifications enabled" — nothing delivers a push yet), but registering against the
 * PORTAL user's own `POST /portal/device-tokens` via `registerPortalDeviceForPushAsync()`. */
function PortalPushRegistrationCard() {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleRegister = async () => {
    setStatus('loading')
    const result = await registerPortalDeviceForPushAsync()
    switch (result.status) {
      case 'registered':
        setStatus('done')
        setMessage(null)
        break
      case 'unsupported':
        setStatus('error')
        setMessage(result.reason === 'web' ? t('push.unsupportedWeb') : t('push.unsupportedSimulator'))
        break
      case 'denied':
        setStatus('error')
        setMessage(t('push.denied'))
        break
      case 'no-project-id':
        setStatus('error')
        setMessage(t('push.noProjectId'))
        break
      case 'register-failed':
        setStatus('error')
        setMessage(t('push.registerFailed'))
        break
    }
  }

  return (
    <Card>
      <Text variant="overline" color="mutedForeground">
        {t('push.title')}
      </Text>
      <Text variant="bodySmall" color="mutedForeground">
        {t('push.description')}
      </Text>
      <View style={styles.action}>
        <Button
          label={status === 'done' ? t('push.registered') : t('push.register')}
          variant={status === 'done' ? 'outline' : 'primary'}
          loading={status === 'loading'}
          disabled={status === 'done'}
          onPress={handleRegister}
        />
      </View>
      {message && status === 'error' ? (
        <Text variant="caption" color="destructive">
          {message}
        </Text>
      ) : null}
    </Card>
  )
}

const styles = StyleSheet.create({
  action: { marginTop: spacing.xs },
  version: { textAlign: 'center' },
})
