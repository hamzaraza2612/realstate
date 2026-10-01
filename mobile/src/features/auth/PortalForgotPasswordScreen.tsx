import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { isNetworkError, portalApiClient } from '@/api/portalApiClient'
import { Button, Card, Input, Text } from '@/components'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { AuthLayout } from './AuthLayout'
import { emailError, requiredError } from './validation'

/** Portal "forgot password" — the existing `POST /portal/auth/request-password-reset`, which always
 * answers 204 (never reveals whether the account exists), so the confirmation copy is neutral. The
 * reset itself is completed from the emailed link on the web portal. */
export function PortalForgotPasswordScreen() {
  const { t } = useI18n()
  const { isOffline } = useNetworkStatus()
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ tenantSlug?: string; email?: string; root?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    const next = { tenantSlug: requiredError(tenantSlug, t), email: emailError(email, t) }
    setErrors(next)
    if (next.tenantSlug || next.email) return
    setSubmitting(true)
    try {
      await portalApiClient.post('/portal/auth/request-password-reset', { tenantSlug: tenantSlug.trim(), email: email.trim() })
      setSent(true)
    } catch (error) {
      setErrors({ root: isNetworkError(error) ? t('auth.errors.network') : t('common.somethingWentWrong') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      {sent ? (
        <Card>
          <Text>{t('auth.forgot.sent')}</Text>
          <Button label={t('auth.forgot.backToSignIn')} onPress={() => router.back()} fullWidth />
        </Card>
      ) : (
        <View style={styles.form}>
          <Input
            label={t('auth.organization')}
            value={tenantSlug}
            onChangeText={setTenantSlug}
            placeholder={t('auth.organizationPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.tenantSlug}
          />
          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={errors.email}
          />
          {errors.root ? (
            <Text variant="bodySmall" color="destructive" accessibilityRole="alert">
              {errors.root}
            </Text>
          ) : null}
          {isOffline ? (
            <Text variant="caption" color="warning">
              {t('offline.actionDisabled')}
            </Text>
          ) : null}
          <Button label={t('auth.forgot.submit')} onPress={submit} loading={submitting} disabled={isOffline} fullWidth />
          <Button label={t('auth.forgot.backToSignIn')} variant="ghost" onPress={() => router.back()} />
        </View>
      )}
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
})
