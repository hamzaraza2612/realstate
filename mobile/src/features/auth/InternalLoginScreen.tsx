import { useRef, useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { extractErrorMessage, isNetworkError } from '@/api/apiClient'
import { useAuth } from '@/auth/AuthProvider'
import { Button, Input, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'
import { AuthLayout } from './AuthLayout'
import { emailError, requiredError } from './validation'

/** Internal (ERP staff) sign-in — `POST /auth/login { email, password }`. */
export function InternalLoginScreen() {
  const { t } = useI18n()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const passwordRef = useRef<TextInput>(null)

  async function submit() {
    const next = { email: emailError(email, t), password: requiredError(password, t) }
    setErrors(next)
    if (next.email || next.password) return
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (error) {
      // Deliberately generic — never reveal which of email/password was wrong.
      setErrors({ root: isNetworkError(error) ? t('auth.errors.network') : extractErrorMessage(error, t('auth.errors.invalidInternal')) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title={t('auth.internal.title')} subtitle={t('auth.internal.subtitle')}>
      <View style={styles.form}>
        <Input
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
        <Button label={t('auth.otherSignIn')} variant="ghost" onPress={() => router.back()} />
      </View>
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
})
