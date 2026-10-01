import { StyleSheet, View } from 'react-native'
import { usePortalAuth } from '@/auth/PortalAuthProvider'
import { Card, EmptyState, PageHeader, Text } from '@/components'
import { Screen } from '@/components/Screen'
import { PreferencesCard } from '@/features/profile/PreferencesCard'
import { SignOutButton } from '@/features/profile/SignOutButton'
import { useI18n } from '@/i18n'
import { spacing } from '@/theme'

/**
 * Phase 1 portal shell: proves the portal sign-in → SecureStore session → `(portal)` navigator path
 * end to end with its own client/store, and gives the user preferences + sign-out. The six portal
 * experiences (customer/tenant/owner/vendor/agent/member) are Phase 3. Never imports anything from
 * the internal app.
 */
export function PortalHomeScreen() {
  const { t } = useI18n()
  const { profile, logout } = usePortalAuth()
  if (!profile) return null

  return (
    <Screen>
      <PageHeader title={t('portal.home.greeting', { name: profile.displayName })} description={profile.tenantName} />
      <Card>
        <Text variant="overline" color="mutedForeground">
          {t('portal.home.account')}
        </Text>
        <View style={styles.field}>
          <Text variant="caption" color="mutedForeground">
            {t('profile.email')}
          </Text>
          <Text>{profile.email}</Text>
        </View>
        <View style={styles.field}>
          <Text variant="caption" color="mutedForeground">
            {t('portal.home.accountType')}
          </Text>
          <Text>{t(`portal.actor.${profile.actorType}`)}</Text>
        </View>
      </Card>
      <Card>
        <EmptyState icon="phone-portrait-outline" title={t('portal.home.comingTitle')} description={t('portal.home.comingDescription')} />
      </Card>
      <PreferencesCard />
      <SignOutButton onSignOut={logout} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
})
