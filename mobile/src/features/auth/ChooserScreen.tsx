import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, Icon, Text } from '@/components'
import { useI18n } from '@/i18n'
import { spacing, useTheme } from '@/theme'
import { AuthLayout } from './AuthLayout'

/** First-launch / signed-out chooser: two clearly separate identities, never a mixed login form
 * (docs/MOBILE_ARCHITECTURE.md "Authentication"). */
export function ChooserScreen() {
  const { t } = useI18n()
  const { colors } = useTheme()

  const options = [
    { key: 'internal', icon: 'business-outline' as const, title: t('auth.chooser.internal'), description: t('auth.chooser.internalDescription'), href: '/login' as const },
    { key: 'portal', icon: 'person-circle-outline' as const, title: t('auth.chooser.portal'), description: t('auth.chooser.portalDescription'), href: '/portal-login' as const },
  ]

  return (
    <AuthLayout title={t('auth.chooser.title')} subtitle={t('auth.chooser.subtitle')}>
      <View style={styles.options}>
        {options.map((option) => (
          <Card key={option.key} onPress={() => router.push(option.href)} accessibilityLabel={`${option.title}. ${option.description}`}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Icon name={option.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.text}>
                <Text variant="subheading">{option.title}</Text>
                <Text variant="bodySmall" color="mutedForeground">
                  {option.description}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.mutedForeground} />
            </View>
          </Card>
        ))}
      </View>
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  options: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
})
