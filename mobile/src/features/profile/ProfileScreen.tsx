import { StyleSheet, View } from 'react-native'
import Constants from 'expo-constants'
import { useAuth } from '@/auth'
import { Badge, Card, PageHeader, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { PreferencesCard } from './PreferencesCard'
import { SignOutButton } from './SignOutButton'

/** Profile tab — the signed-in staff user's identity (from the session), preferences, sign-out. */
export function ProfileScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()
  const { user, logout } = useAuth()
  if (!user) return null

  const initials =
    user.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <Screen>
      <PageHeader title={t('profile.title')} />
      <Card>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text variant="heading" color="primaryForeground">
              {initials}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="heading">{user.fullName}</Text>
            <Text variant="bodySmall" color="mutedForeground">
              {user.email}
            </Text>
          </View>
        </View>
        <Field label={t('profile.organization')} value={user.tenantName ?? '—'} />
        <View style={styles.field}>
          <Text variant="caption" color="mutedForeground">
            {t('profile.roles')}
          </Text>
          <View style={styles.badges}>
            {user.isSuperAdmin ? <Badge label={t('profile.superAdmin')} tone="info" /> : null}
            {user.roles.length === 0 && !user.isSuperAdmin ? (
              <Text variant="bodySmall" color="mutedForeground">
                {t('profile.noRoles')}
              </Text>
            ) : (
              user.roles.map((role) => <Badge key={role} label={role} tone="neutral" />)
            )}
          </View>
        </View>
      </Card>

      <PreferencesCard />

      <SignOutButton onSignOut={logout} />
      <Text variant="caption" color="mutedForeground" style={styles.version}>
        {t('profile.version', { version: Constants.expoConfig?.version ?? '—' })}
      </Text>
    </Screen>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="mutedForeground">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  field: { gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  version: { textAlign: 'center' },
})
