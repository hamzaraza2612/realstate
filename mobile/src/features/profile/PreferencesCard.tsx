import { StyleSheet, View } from 'react-native'
import { Card, SegmentedControl, Text } from '@/components'
import { useI18n, type Language } from '@/i18n'
import { spacing, useTheme, type ThemePreference } from '@/theme'

/** Language (English/Arabic, with the RTL restart prompt) and appearance (system/light/dark).
 * Shared by the internal Profile tab and the portal home — both are per-device UI preferences. */
export function PreferencesCard() {
  const { t, language, setLanguage, restartPending } = useI18n()
  const { preference, setPreference } = useTheme()

  return (
    <Card>
      <Text variant="overline" color="mutedForeground">
        {t('profile.preferences')}
      </Text>
      <View style={styles.field}>
        <Text variant="bodySmall" style={styles.label}>
          {t('profile.language')}
        </Text>
        <SegmentedControl<Language>
          accessibilityLabel={t('profile.language')}
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'en', label: t('language.english') },
            { value: 'ar', label: t('language.arabic') },
          ]}
        />
        {restartPending ? (
          <Text variant="caption" color="warning">
            {t('language.restartPending')}
          </Text>
        ) : null}
      </View>
      <View style={styles.field}>
        <Text variant="bodySmall" style={styles.label}>
          {t('profile.theme')}
        </Text>
        <SegmentedControl<ThemePreference>
          accessibilityLabel={t('profile.theme')}
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: t('profile.themeSystem') },
            { value: 'light', label: t('profile.themeLight') },
            { value: 'dark', label: t('profile.themeDark') },
          ]}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { fontWeight: '600' },
})
