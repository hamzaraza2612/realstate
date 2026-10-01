import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Card, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { registerInternalDeviceForPushAsync } from '@/features/notifications/pushRegistration'

/** A real device-token registration action — not a "push notifications enabled" toggle. Registering
 * only stores this device's Expo push token on the backend (see pushRegistration.ts); no push is
 * ever sent, so the copy and the result states must never imply delivery works. */
export function PushRegistrationCard() {
  const { t } = useI18n()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleRegister = async () => {
    setStatus('loading')
    const result = await registerInternalDeviceForPushAsync()
    switch (result.status) {
      case 'registered':
        setStatus('done')
        setMessage(t('push.registered'))
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
      <Text variant="bodySmall" color="mutedForeground" style={styles.description}>
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
  description: { marginTop: spacing.xs },
  action: { marginTop: spacing.sm },
})
