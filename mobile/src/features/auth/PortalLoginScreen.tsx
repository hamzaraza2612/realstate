import { useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { extractErrorMessage, isNetworkError } from '@/api/portalApiClient'
import { usePortalAuth } from '@/auth/PortalAuthProvider'
import { Button, Input, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { AuthLayout } from './AuthLayout'
import { emailError, requiredError } from './validation'

/** External-portal sign-in — `POST /portal/auth/login { tenantSlug, email, password }` (same three
 * fields as the web `PortalLoginPage`). */
export function PortalLoginScreen() {
  const { t } = useI18n()
  const { login } = usePortalAuth()
  const [tenantSlug, setTenantSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ tenantSlug?: string; email?: string; password?: string; root?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)

  async function submit() {
    const next = { tenantSlug: requiredError(tenantSlug, t), email: emailError(email, t), password: requiredError(password, t) }
    setErrors(next)
    if (next.tenantSlug || next.email || next.password) return
    setSubmitting(true)
    try {
      await login({ tenantSlug: tenantSlug.trim(), email: email.trim(), password })
    } catch (error) {
      // Deliberately generic — never reveal which of organization/email/password was wrong.
      setErrors({ root: isNetworkError(error) ? t('auth.errors.network') : extractErrorMessage(error, t('auth.errors.invalidPortal')) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title={t('auth.portal.title')} subtitle={t('auth.portal.subtitle')}>
      <View style={styles.form}>
        <Input
          label={t('auth.organization')}
          value={tenantSlug}
          onChangeText={setTenantSlug}
          placeholder={t('auth.organizationPlaceholder')}
          hint={t('auth.organizationHint')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="organization"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          error={errors.tenantSlug}
        />
        <Input
          ref={emailRef}
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.email}
        />
        <Input
          ref={passwordRef}
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
        />
        {errors.root ? (
          <Text variant="bodySmall" color="destructive" accessibilityRole="alert">
            {errors.root}
          </Text>
        ) : null}
        <Button label={submitting ? t('auth.signingIn') : t('auth.signIn')} onPress={submit} loading={submitting} fullWidth />
        <Button label={t('auth.forgotPassword')} variant="ghost" onPress={() => router.push('/portal-forgot-password')} />
        <Button label={t('auth.otherSignIn')} variant="ghost" onPress={() => router.back()} />
      </View>
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
})
